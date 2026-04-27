import { db } from '@/lib/db';
import { OtpType } from '@prisma/client';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a 6-digit OTP
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Create and send an OTP to the user
 */
export async function createAndSendOtp(
  userId: string,
  email: string,
  type: OtpType = OtpType.EMAIL_VERIFICATION
): Promise<{ success: boolean; message: string }> {
  try {
    // Invalidate any existing OTPs for this user and type
    await db.otpCode.updateMany({
      where: {
        userId,
        type,
        verified: false,
      },
      data: {
        verified: true, // Mark as used
      },
    });

    // Generate new OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store in database
    await db.otpCode.create({
      data: {
        userId,
        code,
        type,
        expiresAt,
      },
    });

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: 'Your NestMates Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">NestMates</h1>
          <h2>Verify Your Email</h2>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
            ${code}
          </div>
          <p style="margin-top: 20px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error creating OTP:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
}

/**
 * Verify an OTP
 */
export async function verifyOtp(
  userId: string,
  code: string,
  type: OtpType = OtpType.EMAIL_VERIFICATION
): Promise<{ success: boolean; message: string }> {
  try {
    // Find the OTP
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
      return { success: false, message: 'No valid OTP found. Please request a new one.' };
    }

    // Check attempts
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      return { success: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    // Increment attempts
    await db.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify code
    if (otp.code !== code) {
      const remainingAttempts = MAX_OTP_ATTEMPTS - otp.attempts - 1;
      return {
        success: false,
        message: `Invalid code. ${remainingAttempts} attempts remaining.`,
      };
    }

    // Mark as verified
    await db.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Update user's email verification status
    if (type === OtpType.EMAIL_VERIFICATION) {
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });
    }

    return { success: true, message: 'Verification successful' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'Verification failed' };
  }
}

