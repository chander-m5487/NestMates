import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { generateOtp, hashOtp, OTP_TYPE_PASSWORD_RESET } from '@/lib/auth/otp';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, isValidEmail } from '@/lib/security/sanitize';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    const rateLimitResult = checkRateLimit(clientIP, 'auth-forgot-password', RATE_LIMITS.AUTH_FORGOT_PASSWORD);
    if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult);

    const body = await request.json();
    let { email } = body;

    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    email = sanitizeEmail(email);
    if (!isValidEmail(email)) return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });

    const GENERIC = NextResponse.json({
      message: 'If an account exists with this email, a reset code has been sent.',
    });

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, status: true },
    });

    // Always return 200 to prevent email enumeration
    if (!user || user.status !== 'ACTIVE') return GENERIC;

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // SC-004: use dedicated PASSWORD_RESET type — cannot be replayed as LOGIN OTP
    await db.otpCode.updateMany({
      where: { userId: user.id, type: OTP_TYPE_PASSWORD_RESET, verified: false },
      data: { verified: true },
    });

    // SC-003: store hash, not plaintext
    await db.otpCode.create({
      data: {
        userId: user.id,
        codeHash: hashOtp(code),
        type: OTP_TYPE_PASSWORD_RESET,
        expiresAt,
        ipAddress: clientIP !== 'unknown' ? clientIP : null,
        userAgent: userAgent ?? null,
      },
    });

    await writeAuditLog({ userId: user.id, action: 'PASSWORD_RESET_REQUEST', ipAddress: clientIP, userAgent });

    await sendEmail({
      to: email,
      subject: 'Reset Your NestMates Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #075985 100%); padding: 24px 28px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">NestMates</h1>
            <p style="color: #bae6fd; margin: 4px 0 0; font-size: 13px;">Your trusted housing platform</p>
          </div>
          <div style="background: #ffffff; padding: 32px 28px; border: 1px solid #e0f2fe; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #0c4a6e; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #475569;">Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 24px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 12px; border-radius: 12px; color: #0284c7; margin: 24px 0;">
              ${code}
            </div>
            <p style="color: #94a3b8; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} NestMates. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return GENERIC;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
