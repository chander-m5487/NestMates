import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

// GET /api/profile/[userId]
// Returns the public-facing profile of any user (used for the popup on post cards).
// Age is derived server-side from DOB (raw DOB is never exposed to other users).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const clientIP = getClientIP(request);
  const rl = checkRateLimit(clientIP, 'profile-public-get', RATE_LIMITS.API_GENERAL);
  if (!rl.allowed) return rateLimitResponse(rl);

  // Must be logged in to view another user's profile
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: {
      id:        true,
      name:      true,
      uniqueUserId: true,
      createdAt: true,
      profile:   true,
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Compute age from DOB (never expose raw DOB to other users)
  let age: number | null = null;
  if (user.profile?.dateOfBirth) {
    age = Math.floor(
      (Date.now() - new Date(user.profile.dateOfBirth).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    );
  }

  return NextResponse.json({
    user: {
      id:          user.id,
      name:        user.name,
      username:    user.uniqueUserId,
      memberSince: user.createdAt,
      profile: user.profile
        ? {
            smoking:   user.profile.smoking,
            drinking:  user.profile.drinking,
            dietary:   user.profile.dietary,
            gender:    user.profile.gender,
            ethnicity: user.profile.ethnicity,
            bio:       user.profile.bio,
            age,
          }
        : null,
    },
  });
}
