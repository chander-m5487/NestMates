import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// POST - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await db.notification.updateMany({
      where: {
        userId: session.id,
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

