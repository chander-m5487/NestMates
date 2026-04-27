import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { verifyOtp } from '@/lib/auth/otp';
import { OtpType } from '@prisma/client';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for OTP verification to prevent brute force
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'auth-verify-otp', RATE_LIMITS.AUTH_SIGNIN);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { message: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    const result = await verifyOtp(
      session.user.id,
      code,
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
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

