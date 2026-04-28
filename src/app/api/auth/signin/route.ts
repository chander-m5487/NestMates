import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, isValidEmail } from '@/lib/security/sanitize';
import { JWT_SECRET } from '@/lib/auth/jwt';
import { writeAuditLog, truncateIp } from '@/lib/audit';

// Lockout config — SC-002
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    // IP-level rate limit (first layer)
    const rateLimitResult = checkRateLimit(clientIP, 'auth-signin', RATE_LIMITS.AUTH_SIGNIN);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    email = sanitizeEmail(email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    // Generic error — don't reveal whether the email is registered
    const INVALID = NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    if (!user) return INVALID;

    // SC-005/SC-008: reject suspended/banned accounts before wasting bcrypt
    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ message: 'Your account is not available. Please contact support.' }, { status: 403 });
    }

    // SC-002: DB-backed lockout check — survives restarts and multi-instance
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const seconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      await writeAuditLog({ userId: user.id, action: 'LOGIN_FAILED', ipAddress: clientIP, userAgent, metadata: { reason: 'locked' } });
      return NextResponse.json(
        { message: `Account is temporarily locked. Try again in ${Math.ceil(seconds / 60)} minute(s).` },
        { status: 429 }
      );
    }

    if (!user.passwordHash) return INVALID;

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(shouldLock && { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) }),
        },
      });
      await writeAuditLog({
        userId: user.id, action: 'LOGIN_FAILED',
        ipAddress: clientIP, userAgent,
        metadata: { attempt: newAttempts, locked: shouldLock },
      });
      if (shouldLock) {
        await writeAuditLog({ userId: user.id, action: 'ACCOUNT_LOCKED', ipAddress: clientIP, userAgent });
      }
      return INVALID;
    }

    // Block sign-in if email not yet verified — omit email to avoid enumeration
    if (!user.emailVerified) {
      return NextResponse.json(
        { message: 'Please verify your email before signing in.', needsVerification: true },
        { status: 403 }
      );
    }

    // SC-006: persist last login IP + timestamp; reset lockout counter
    const truncatedIp = truncateIp(clientIP);

    await db.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
        lastLoginIp: truncatedIp,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // SC-007: audit successful login
    await writeAuditLog({ userId: user.id, action: 'LOGIN', ipAddress: clientIP, userAgent });

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      uniqueUserId: user.uniqueUserId,
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
      message: 'Signed in successfully',
      user: { id: user.id, email: user.email, name: user.name, uniqueUserId: user.uniqueUserId },
    });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
