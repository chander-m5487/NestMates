import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, isValidEmail, validatePassword } from '@/lib/security/sanitize';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for password reset
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'auth-reset-password', RATE_LIMITS.AUTH_FORGOT_PASSWORD);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Sanitize and validate email
    email = sanitizeEmail(email);
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid reset code' },
        { status: 400 }
      );
    }

    // Find valid OTP
    const otp = await db.otpCode.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'LOGIN',
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json(
        { message: 'Invalid or expired reset code' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await db.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in Account
    await db.account.updateMany({
      where: {
        userId: user.id,
        provider: 'credentials',
      },
      data: {
        access_token: hashedPassword,
      },
    });

    // If no credentials account exists, create one
    const existingAccount = await db.account.findFirst({
      where: {
        userId: user.id,
        provider: 'credentials',
      },
    });

    if (!existingAccount) {
      await db.account.create({
        data: {
          userId: user.id,
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: user.id,
          access_token: hashedPassword,
        },
      });
    }

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

