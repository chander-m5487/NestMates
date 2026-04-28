import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyEmailOtp } from '@/lib/auth/otp';
import { sanitizeEmail, isValidEmail } from '@/lib/security/sanitize';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/auth/jwt';
import { writeAuditLog, truncateIp } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    const rateLimitResult = checkRateLimit(clientIP, 'auth-verify-otp', RATE_LIMITS.AUTH_SIGNIN);
    if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult);

    const body = await request.json();
    let { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ message: 'Email and verification code are required' }, { status: 400 });
    }

    email = sanitizeEmail(email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    if (typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ message: 'Verification code must be 6 digits' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, uniqueUserId: true, displayName: true, emailVerified: true, status: true },
    });

    // Generic error — don't reveal account state
    const GENERIC = NextResponse.json({ message: 'Invalid or expired verification code' }, { status: 400 });
    if (!user) return GENERIC;
    if (user.emailVerified) return GENERIC;
    if (user.status !== 'ACTIVE') return GENERIC;

    const result = await verifyEmailOtp(user.id, code);

    if (!result.success) {
      await writeAuditLog({ userId: user.id, action: 'OTP_FAIL', ipAddress: clientIP, userAgent });
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    await writeAuditLog({ userId: user.id, action: 'OTP_VERIFY', ipAddress: clientIP, userAgent });

    await db.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
        lastLoginIp: truncateIp(clientIP),
        // Clear any lockout that may have been set from failed signin attempts
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const token = await new SignJWT({
      id: user.id, email: user.email, name: user.name, uniqueUserId: user.uniqueUserId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({
      message: 'Email verified. Welcome to NestMates!',
      user: { id: user.id, email: user.email, name: user.name, uniqueUserId: user.uniqueUserId },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
