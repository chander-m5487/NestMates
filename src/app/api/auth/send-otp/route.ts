import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createAndSendOtp } from '@/lib/auth/otp';
import { OtpType } from '@prisma/client';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for OTP sending
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'auth-send-otp', RATE_LIMITS.AUTH_FORGOT_PASSWORD);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await createAndSendOtp(
      session.user.id,
      session.user.email,
      OtpType.EMAIL_VERIFICATION
    );

    if (!result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

