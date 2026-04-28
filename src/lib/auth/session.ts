import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/auth/jwt';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  uniqueUserId: string;
  displayName: string | null;
  role: string;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // SC-008: re-hydrate from DB and enforce status check.
    // A suspended/banned user's JWT stays structurally valid until expiry,
    // but this guard rejects it on every request without waiting 7 days.
    const user = await db.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        uniqueUserId: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      uniqueUserId: user.uniqueUserId,
      displayName: user.displayName,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = await db.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        uniqueUserId: true,
        displayName: true,
        role: true,
        status: true,
      },
    });
    if (!user || user.status !== 'ACTIVE') return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      uniqueUserId: user.uniqueUserId,
      displayName: user.displayName,
      role: user.role,
    };
  } catch {
    return null;
  }
}
