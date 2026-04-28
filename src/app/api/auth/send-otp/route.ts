import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAndSendOtp } from '@/lib/auth/otp';
import { sanitizeEmail, isValidEmail } from '@/lib/security/sanitize';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

/**
 * POST /api/auth/send-otp
 * Body: { email }
 * Sends a 6-digit OTP to the given email for email verification.
 * Does NOT require a session — called during signup or from the verify page.
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') ?? undefined;
    const rateLimitResult = checkRateLimit(clientIP, 'auth-send-otp', RATE_LIMITS.AUTH_FORGOT_PASSWORD);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { email } = body;

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    email = sanitizeEmail(email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      // Generic — don't reveal if email is registered
      return NextResponse.json({ message: 'Verification code sent if account exists' });
    }

    if (user.emailVerified) {
      // Don't reveal — return same generic success
      return NextResponse.json({ message: 'Verification code sent if account exists' });
    }

    const result = await createAndSendOtp(user.id, user.email, undefined, clientIP, userAgent);

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 500 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
