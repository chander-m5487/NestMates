import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notifications = await db.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
