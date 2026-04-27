import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

// In production, NEXTAUTH_SECRET must be set
const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET must be set in production');
}
const JWT_SECRET = new TextEncoder().encode(secret || 'dev-secret-key-change-in-production');

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  uniqueUserId: string;
  displayName: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Fetch fresh user data
    const user = await db.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        uniqueUserId: true,
        displayName: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

