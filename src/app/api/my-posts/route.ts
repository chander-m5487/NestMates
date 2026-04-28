import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rl = checkRateLimit(clientIP, 'my-posts', RATE_LIMITS.API_GENERAL);
    if (!rl.allowed) return rateLimitResponse(rl);
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const posts = await db.accommodationPost.findMany({
      where: { userId: session.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      accommodation: posts.map((post) => ({ ...post, type: 'accommodation' })),
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
