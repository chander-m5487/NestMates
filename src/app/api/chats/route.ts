import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addHours } from 'date-fns';
import { decrypt } from '@/lib/crypto';

// GET - Fetch user's chats (always global — not filtered by country/state)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Include inactive chats that are still within the 48-hour read window
    // (scheduledDeletionAt in the future) so users can review them before
    // they are hard-deleted. Active chats always show; inactive ones show
    // only until the cron deletes them.
    const now = new Date();
    const chats = await db.chat.findMany({
      where: {
        AND: [
          {
            OR: [{ ownerId: session.id }, { responderId: session.id }],
          },
          {
            OR: [
              { isActive: true },
              { isActive: false, scheduledDeletionAt: { gt: now } },
            ],
          },
        ],
      },
      include: {
        owner: {
          select: { id: true, uniqueUserId: true, displayName: true },
        },
        responder: {
          select: { id: true, uniqueUserId: true, displayName: true },
        },
        accommodationPost: {
          select: { id: true, formattedAddress: true, propertyType: true, isActive: true, expiresAt: true },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { content: true, sentAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Single aggregated query for all unread counts — replaces the N+1 pattern
    // of running one count() per chat.
    const unreadRows = await db.message.groupBy({
      by: ['chatId'],
      where: {
        chatId: { in: chats.map(c => c.id) },
        senderId: { not: session.id },
        readAt: null,
      },
      _count: { id: true },
    });
    const unreadMap = new Map(unreadRows.map(r => [r.chatId, r._count.id]));

    const formattedChats = chats.map((chat) => {
      const isOwner = chat.ownerId === session.id;
      const otherUser = isOwner ? chat.responder : chat.owner;
      const lastMessage = chat.messages[0];

      let decryptedContent: string | null = null;
      if (lastMessage?.content) {
        try {
          decryptedContent = decrypt(lastMessage.content);
        } catch {
          decryptedContent = lastMessage.content;
        }
      }

      return {
        id: chat.id,
        chatType: chat.chatType,
        isActive: chat.isActive,
        scheduledDeletionAt: chat.scheduledDeletionAt,
        otherUser: {
          id: otherUser.id,
          uniqueUserId: otherUser.uniqueUserId,
          displayName: otherUser.displayName,
        },
        post: {
          id: chat.accommodationPost?.id,
          title: chat.accommodationPost?.formattedAddress,
          type: chat.accommodationPost?.propertyType,
          isActive: chat.accommodationPost?.isActive ?? false,
          expiresAt: chat.accommodationPost?.expiresAt ?? null,
        },
        lastMessage: lastMessage
          ? { content: decryptedContent, sentAt: lastMessage.sentAt, isOwn: lastMessage.senderId === session.id }
          : null,
        unreadCount: unreadMap.get(chat.id) || 0,
        expiresAt: chat.expiresAt,
        createdAt: chat.createdAt,
      };
    });

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST - Create new chat (respond to an accommodation post)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const post = await db.accommodationPost.findUnique({
      where: { id: postId, isActive: true, expiresAt: { gt: new Date() } },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found or no longer active' }, { status: 404 });
    }

    if (post.userId === session.id) {
      return NextResponse.json({ error: 'Cannot create chat with yourself' }, { status: 400 });
    }

    // Return existing active chat if one already exists
    const existingChat = await db.chat.findFirst({
      where: { accommodationPostId: postId, responderId: session.id, isActive: true },
    });

    if (existingChat) {
      return NextResponse.json({ chat: { id: existingChat.id, chatType: existingChat.chatType } });
    }

    const chatExpiresAt = post.expiresAt;
    const chatDeletionDate = addHours(post.expiresAt, 48);

    const chat = await db.chat.create({
      data: {
        chatType: 'ACCOMMODATION',
        accommodationPostId: postId,
        ownerId: post.userId,
        responderId: session.id,
        expiresAt: chatExpiresAt,
        scheduledDeletionAt: chatDeletionDate,
      },
    });

    await db.notification.create({
      data: {
        userId: post.userId,
        type: 'NEW_CHAT_RESPONSE',
        title: 'New response to your post',
        message: 'Someone is interested in your listing',
        data: JSON.stringify({ chatId: chat.id, postId }),
      },
    });

    return NextResponse.json({ chat: { id: chat.id, chatType: chat.chatType } }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
