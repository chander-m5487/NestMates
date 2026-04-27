import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, isValidEmail } from '@/lib/security/sanitize';

// In production, NEXTAUTH_SECRET must be set
const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET must be set in production');
}
const JWT_SECRET = new TextEncoder().encode(secret || 'dev-secret-key-change-in-production');

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'auth-signin', RATE_LIMITS.AUTH_SIGNIN);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    let { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sanitize email
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
      include: {
        accounts: {
          where: { provider: 'credentials' },
        },
      },
    });

    if (!user || user.accounts.length === 0) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password (stored in access_token field)
    const account = user.accounts[0];
    const isValidPassword = await bcrypt.compare(
      password,
      account.access_token || ''
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last active
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Create JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      uniqueUserId: user.uniqueUserId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      message: 'Signed in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        uniqueUserId: user.uniqueUserId,
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

