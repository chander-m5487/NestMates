import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// GET - Get count of unread messages
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ count: 0 });
    }

    // Count unread messages in chats where the user is a participant
    const unreadCount = await db.message.count({
      where: {
        senderId: { not: session.id },
        readAt: null,
        chat: {
          OR: [
            { ownerId: session.id },
            { responderId: session.id },
          ],
          isActive: true,
        },
      },
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error('Error counting unread messages:', error);
    return NextResponse.json({ count: 0 });
  }
}

