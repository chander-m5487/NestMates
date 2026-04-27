import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// GET - Fetch user's own posts
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all user's ACTIVE posts (filter out deleted ones)
    const [accommodationPosts, logisticsPosts, eventPosts] = await Promise.all([
      db.accommodationPost.findMany({
        where: { userId: session.id, isActive: true },
        orderBy: { createdAt: 'desc' },
        include: {
          state: {
            include: { country: true },
          },
        },
      }),
      db.logisticsPost.findMany({
        where: { userId: session.id, isActive: true },
        orderBy: { createdAt: 'desc' },
        include: {
          state: {
            include: { country: true },
          },
        },
      }),
      db.eventPost.findMany({
        where: { userId: session.id, isActive: true },
        orderBy: { createdAt: 'desc' },
        include: {
          state: {
            include: { country: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      accommodation: accommodationPosts.map(post => ({
        ...post,
        type: 'accommodation',
      })),
      rides: logisticsPosts.map(post => ({
        ...post,
        type: 'rides',
      })),
      events: eventPosts.map(post => ({
        ...post,
        type: 'events',
      })),
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

