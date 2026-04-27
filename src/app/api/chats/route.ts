import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addMonths } from 'date-fns';
import { decrypt } from '@/lib/crypto';

// GET - Fetch user's chats
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const chats = await db.chat.findMany({
      where: {
        OR: [
          { ownerId: session.id },
          { responderId: session.id },
        ],
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            uniqueUserId: true,
            displayName: true,
            email: true,
          },
        },
        responder: {
          select: {
            id: true,
            uniqueUserId: true,
            displayName: true,
            email: true,
          },
        },
        accommodationPost: {
          select: {
            id: true,
            formattedAddress: true,
            propertyType: true,
          },
        },
        logisticsPost: {
          select: {
            id: true,
            fromCity: true,
            toCity: true,
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: {
            content: true,
            sentAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get unread counts for all chats
    const unreadCounts = await Promise.all(
      chats.map(async (chat) => {
        const count = await db.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: session.id },
            readAt: null,
          },
        });
        return { chatId: chat.id, count };
      })
    );
    const unreadMap = new Map(unreadCounts.map(u => [u.chatId, u.count]));

    // Format chats for response
    const formattedChats = chats.map((chat) => {
      const isOwner = chat.ownerId === session.id;
      const otherUser = isOwner ? chat.responder : chat.owner;
      const lastMessage = chat.messages[0];

      // Decrypt last message content if present
      let decryptedContent = null;
      if (lastMessage?.content) {
        try {
          decryptedContent = decrypt(lastMessage.content);
        } catch {
          // If decryption fails, use original (might be unencrypted legacy)
          decryptedContent = lastMessage.content;
        }
      }

      return {
        id: chat.id,
        chatType: chat.chatType,
        otherUser: {
          id: otherUser.id,
          uniqueUserId: otherUser.uniqueUserId,
          displayName: otherUser.displayName,
          email: otherUser.email,
        },
        post: chat.chatType === 'ACCOMMODATION'
          ? {
              id: chat.accommodationPost?.id,
              title: chat.accommodationPost?.formattedAddress,
              type: chat.accommodationPost?.propertyType,
            }
          : {
              id: chat.logisticsPost?.id,
              title: `${chat.logisticsPost?.fromCity} → ${chat.logisticsPost?.toCity}`,
            },
        lastMessage: lastMessage
          ? {
              content: decryptedContent,
              sentAt: lastMessage.sentAt,
              isOwn: lastMessage.senderId === session.id,
            }
          : null,
        unreadCount: unreadMap.get(chat.id) || 0,
        expiresAt: chat.expiresAt,
        createdAt: chat.createdAt,
      };
    });

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST - Create new chat (respond to a post)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { postId, postType } = body;

    if (!postId || !postType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the post to find the owner
    let post;
    let chatType: string;
    let postExpiresAt: Date;

    if (postType === 'accommodation') {
      post = await db.accommodationPost.findUnique({
        where: { id: postId },
      });
      chatType = 'ACCOMMODATION';
      postExpiresAt = post?.expiresAt || new Date();
    } else if (postType === 'logistics') {
      post = await db.logisticsPost.findUnique({
        where: { id: postId },
      });
      chatType = 'LOGISTICS';
      postExpiresAt = post?.expiresAt || new Date();
    } else {
      return NextResponse.json(
        { error: 'Invalid post type' },
        { status: 400 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Can't chat with yourself
    if (post.userId === session.id) {
      return NextResponse.json(
        { error: 'Cannot create chat with yourself' },
        { status: 400 }
      );
    }

    // Check if chat already exists
    const existingChat = await db.chat.findFirst({
      where: {
        chatType,
        [postType === 'accommodation' ? 'accommodationPostId' : 'logisticsPostId']: postId,
        responderId: session.id,
      },
    });

    if (existingChat) {
      return NextResponse.json({ chat: existingChat });
    }

    // Create new chat
    // Chat expires 1 month after post expires
    const chatExpiresAt = addMonths(postExpiresAt, 1);

    const chat = await db.chat.create({
      data: {
        chatType,
        [postType === 'accommodation' ? 'accommodationPostId' : 'logisticsPostId']: postId,
        ownerId: post.userId,
        responderId: session.id,
        expiresAt: chatExpiresAt,
      },
    });

    // Create notification for post owner
    await db.notification.create({
      data: {
        userId: post.userId,
        type: 'NEW_CHAT_RESPONSE',
        title: 'New response to your post',
        message: 'Someone is interested in your listing',
        data: JSON.stringify({ chatId: chat.id, postId }),
      },
    });

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}
