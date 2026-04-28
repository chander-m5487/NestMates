import { db } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export const OTP_TYPE_EMAIL_VERIFICATION = 'EMAIL_VERIFICATION';
export const OTP_TYPE_PASSWORD_RESET = 'PASSWORD_RESET'; // SC-004: distinct type

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * SC-003: Hash an OTP with SHA-256 before storing.
 * OTPs are random (not dictionary words) so a fast hash is fine —
 * the entropy is in the random generation, not the hashing rounds.
 */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Create and send an OTP to the user.
 * Does not require an active session — called during signup or resend.
 *
 * SC-010: accepts optional ipAddress / userAgent for audit storage.
 */
export async function createAndSendOtp(
  userId: string,
  email: string,
  type: string = OTP_TYPE_EMAIL_VERIFICATION,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Invalidate any existing unverified OTPs of the same type for this user
    await db.otpCode.updateMany({
      where: { userId, type, verified: false },
      data: { verified: true },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // SC-003: store hash, never the raw code
    await db.otpCode.create({
      data: {
        userId,
        codeHash: hashOtp(code),
        type,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    await sendEmail({
      to: email,
      subject: 'Your NestMates Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h1 style="color: #0284c7; margin-bottom: 4px;">NestMates</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Your trusted housing platform</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <h2 style="color: #1e293b;">Verify Your Email</h2>
          <p style="color: #475569;">Use the code below to verify your account. It expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 24px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 12px; border-radius: 12px; color: #0284c7; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #94a3b8; font-size: 13px;">If you did not create a NestMates account, you can safely ignore this email.</p>
        </div>
      `,
    });

    return { success: true, message: 'Verification code sent to your email' };
  } catch (error) {
    console.error('Error creating OTP:', error);
    return { success: false, message: 'Failed to send verification code' };
  }
}

/**
 * Verify an OTP for a given type.
 * On success, marks the OTP as verified.
 * For EMAIL_VERIFICATION type, also marks the user's email as verified.
 *
 * SC-003: compares SHA-256 digest of submitted code against stored hash.
 */
export async function verifyOtp(
  userId: string,
  code: string,
  type: string = OTP_TYPE_EMAIL_VERIFICATION,
): Promise<{ success: boolean; message: string }> {
  try {
    const otp = await db.otpCode.findFirst({
      where: {
        userId,
        type,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return { success: false, message: 'Code not found or has expired. Please request a new one.' };
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      return { success: false, message: 'Too many incorrect attempts. Please request a new code.' };
    }

    // SC-003: compare against stored hash
    if (otp.codeHash !== hashOtp(code)) {
      await db.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
      return {
        success: false,
        message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    }

    await db.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    if (type === OTP_TYPE_EMAIL_VERIFICATION) {
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });
    }

    return { success: true, message: 'Verified successfully' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
}

// Keep the old export name as an alias so existing callers don't break
export const verifyEmailOtp = (userId: string, code: string) =>
  verifyOtp(userId, code, OTP_TYPE_EMAIL_VERIFICATION);
