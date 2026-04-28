import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, isValidEmail, validatePassword } from '@/lib/security/sanitize';
import { hashOtp, OTP_TYPE_PASSWORD_RESET } from '@/lib/auth/otp';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    const rateLimitResult = checkRateLimit(clientIP, 'auth-reset-password', RATE_LIMITS.AUTH_FORGOT_PASSWORD);
    if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult);

    const body = await request.json();
    let { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    email = sanitizeEmail(email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ message: passwordValidation.errors[0] }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    // Generic error — don't reveal account existence
    const INVALID = NextResponse.json({ message: 'Invalid reset code' }, { status: 400 });
    if (!user || user.status !== 'ACTIVE') return INVALID;

    // SC-004: only PASSWORD_RESET type codes are valid here
    // SC-003: compare against stored hash
    const otp = await db.otpCode.findFirst({
      where: {
        userId: user.id,
        codeHash: hashOtp(String(code)),
        type: OTP_TYPE_PASSWORD_RESET,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) return INVALID;

    // Invalidate the OTP
    await db.otpCode.update({ where: { id: otp.id }, data: { verified: true } });

    // SC-001: update passwordHash on User directly
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // Reset any lockout on successful password change
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await writeAuditLog({ userId: user.id, action: 'PASSWORD_RESET', ipAddress: clientIP, userAgent });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
