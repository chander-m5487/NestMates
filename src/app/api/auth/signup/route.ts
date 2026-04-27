import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, sanitizeName, isValidEmail, validatePassword } from '@/lib/security/sanitize';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'auth-signup', RATE_LIMITS.AUTH_SIGNUP);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { name, email, password } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    name = sanitizeName(name);
    email = sanitizeEmail(email);

    if (!name || name.length < 2) {
      return NextResponse.json(
        { message: 'Please enter a valid name' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate uniqueUserId from email prefix
    const emailPrefix = email.toLowerCase().split('@')[0];
    
    // Check if uniqueUserId already exists, if so add a number
    let uniqueUserId = emailPrefix;
    let counter = 1;
    while (await db.user.findUnique({ where: { uniqueUserId } })) {
      uniqueUserId = `${emailPrefix}${counter}`;
      counter++;
    }

    // Create user
    const user = await db.user.create({
      data: {
        name,
        displayName: name,
        email: email.toLowerCase(),
        uniqueUserId,
      },
    });

    // Store password in Account (using credentials provider pattern)
    await db.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: user.id,
        access_token: hashedPassword, // Store hashed password here
      },
    });

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

