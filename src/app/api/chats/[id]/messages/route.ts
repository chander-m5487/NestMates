import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { sanitizeMessage } from '@/lib/security/sanitize';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chat = await db.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ ownerId: session.id }, { responderId: session.id }],
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: { chatId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: { select: { id: true, uniqueUserId: true, displayName: true } },
      },
    });

    await db.message.updateMany({
      where: { chatId, senderId: { not: session.id }, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      messages: messages.map((msg) => {
        let content = msg.content;
        try {
          content = decrypt(msg.content);
        } catch {
          console.warn('Failed to decrypt message, using original:', msg.id);
        }
        return {
          id: msg.id,
          content,
          sentAt: msg.sentAt,
          readAt: msg.readAt,
          sender: msg.sender,
          isOwn: msg.senderId === session.id,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;

    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'send-message', RATE_LIMITS.API_SEND_MESSAGE);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    content = sanitizeMessage(content.trim());

    const chat = await db.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ ownerId: session.id }, { responderId: session.id }],
        isActive: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    if (chat.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This chat has expired' }, { status: 400 });
    }

    const encryptedContent = encrypt(content);
    const message = await db.message.create({
      data: { chatId, senderId: session.id, content: encryptedContent },
      include: {
        sender: { select: { id: true, uniqueUserId: true, displayName: true } },
      },
    });

    await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    const recipientId = chat.ownerId === session.id ? chat.responderId : chat.ownerId;
    await db.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: 'New message',
        message: content.length > 50 ? content.substring(0, 50) + '...' : content,
        data: JSON.stringify({ chatId, messageId: message.id }),
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content,
        sentAt: message.sentAt,
        sender: message.sender,
        isOwn: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
