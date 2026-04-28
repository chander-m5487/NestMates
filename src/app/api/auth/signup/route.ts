import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, sanitizeName, isValidEmail, validatePassword } from '@/lib/security/sanitize';
import { createAndSendOtp, OTP_TYPE_EMAIL_VERIFICATION } from '@/lib/auth/otp';
import { SAFETY_NOTICE_VERSION } from '@/lib/safety/notice';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(clientIP, 'auth-signup', RATE_LIMITS.AUTH_SIGNUP);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { name, email, password } = body;
    const safetyAcknowledged = body?.safetyAcknowledged === true;
    const safetyVersion = typeof body?.safetyVersion === 'string' ? body.safetyVersion : null;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    // Safety notice must be acknowledged with the current version
    if (!safetyAcknowledged || safetyVersion !== SAFETY_NOTICE_VERSION) {
      return NextResponse.json(
        { message: 'Please review and acknowledge the community safety notice before signing up.' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    name = sanitizeName(name);
    email = sanitizeEmail(email);

    if (!name || name.length < 2) {
      return NextResponse.json({ message: 'Please enter a valid name' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ message: passwordValidation.errors[0] }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      if (existingUser.emailVerified) {
        // Already fully registered — return generic success to prevent enumeration.
        // Do NOT resend OTP or create another account; just tell them to sign in.
        return NextResponse.json(
          { message: 'Account created. Please verify your email.', needsVerification: false, email: email.toLowerCase() },
          { status: 201 }
        );
      }
      // Unverified account: resend OTP so they can complete sign-up
      await createAndSendOtp(existingUser.id, existingUser.email, OTP_TYPE_EMAIL_VERIFICATION, clientIP, userAgent);
      return NextResponse.json(
        { message: 'Account created. Please verify your email.', needsVerification: true, email: email.toLowerCase() },
        { status: 201 }
      );
    }

    // SC-001: hash password with bcrypt (cost 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique public userId from email prefix
    const emailPrefix = email.toLowerCase().split('@')[0];
    let uniqueUserId = emailPrefix;
    let counter = 1;
    while (await db.user.findUnique({ where: { uniqueUserId } })) {
      uniqueUserId = `${emailPrefix}${counter++}`;
    }

    // SC-001: passwordHash lives on User, no Account.access_token abuse
    // SC-006: signupIp stored (truncated by writeAuditLog helper)
    const truncatedIp = clientIP !== 'unknown'
      ? clientIP.includes('.')
        ? clientIP.split('.').map((p, i) => i === 3 ? 'x' : p).join('.')
        : clientIP
      : null;

    const user = await db.user.create({
      data: {
        name,
        displayName: name,
        email: email.toLowerCase(),
        uniqueUserId,
        passwordHash,
        signupIp: truncatedIp,
        safetyAcknowledgedAt: new Date(),
        safetyAcknowledgedVersion: safetyVersion,
      },
    });

    // SC-007: audit log
    await writeAuditLog({
      userId: user.id,
      action: 'SIGNUP',
      ipAddress: clientIP,
      userAgent,
      metadata: { email: user.email },
    });

    // Send OTP for email verification — user is NOT signed in yet
    const otpResult = await createAndSendOtp(
      user.id, user.email, OTP_TYPE_EMAIL_VERIFICATION, clientIP, userAgent
    );
    if (!otpResult.success) {
      console.error('OTP send failed after signup for:', user.email);
    }

    return NextResponse.json(
      { message: 'Account created. Please verify your email.', needsVerification: true, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
