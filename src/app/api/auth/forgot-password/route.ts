import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { generateOTP } from '@/lib/crypto';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, isValidEmail } from '@/lib/security/sanitize';
// Note: Using generateOTP from crypto module instead of crypto.randomInt for better security

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for password reset
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'auth-forgot-password', RATE_LIMITS.AUTH_FORGOT_PASSWORD);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
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

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists, a reset code will be sent.',
      });
    }

    // Generate secure 6-digit OTP
    const code = generateOTP(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing reset codes
    await db.otpCode.updateMany({
      where: {
        userId: user.id,
        type: 'LOGIN',
        verified: false,
      },
      data: { verified: true },
    });

    // Create new OTP
    await db.otpCode.create({
      data: {
        userId: user.id,
        code,
        type: 'LOGIN', // Using LOGIN type for password reset
        expiresAt,
      },
    });

    // Send email
    await sendEmail({
      to: email,
      subject: 'Reset Your NestMates Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">NestMates</h1>
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the code below:</p>
          <div style="background: #f5f5f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
            ${code}
          </div>
          <p style="margin-top: 20px;">This code expires in 15 minutes.</p>
          <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: 'Reset code sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

