import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addWeeks } from 'date-fns';

/**
 * Cleanup API - handles scheduled deletions and expired posts
 * This should be called periodically (e.g., via cron job)
 * 
 * Tasks:
 * 1. Delete chats that have passed their scheduledDeletionAt date
 * 2. Schedule deletion for chats of expired posts (1 week after expiration)
 * 3. Hard delete messages for deleted chats
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal call or has proper authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if CRON_SECRET is not set (development) or matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const oneWeekFromNow = addWeeks(now, 1);
    
    let deletedChatsCount = 0;
    let deletedMessagesCount = 0;
    let scheduledChatsCount = 0;

    // 1. Delete chats that have passed their scheduledDeletionAt date
    // First, get the chats to be deleted
    const chatsToDelete = await db.chat.findMany({
      where: {
        scheduledDeletionAt: {
          lte: now,
        },
      },
      select: { id: true },
    });

    if (chatsToDelete.length > 0) {
      const chatIds = chatsToDelete.map(c => c.id);

      // Delete messages first (due to foreign key constraints)
      const deletedMessages = await db.message.deleteMany({
        where: {
          chatId: { in: chatIds },
        },
      });
      deletedMessagesCount = deletedMessages.count;

      // Then delete the chats
      const deletedChats = await db.chat.deleteMany({
        where: {
          id: { in: chatIds },
        },
      });
      deletedChatsCount = deletedChats.count;
    }

    // 2. Schedule deletion for chats of expired accommodation posts
    const expiredAccommodationPosts = await db.accommodationPost.findMany({
      where: {
        OR: [
          // Posts that are soft-deleted
          {
            isActive: false,
            deletedAt: { not: null },
          },
          // Posts that have expired
          {
            expiresAt: { lte: now },
          },
        ],
      },
      select: { id: true, deletedAt: true, expiresAt: true },
    });

    for (const post of expiredAccommodationPosts) {
      const deletionDate = post.deletedAt || post.expiresAt;
      const scheduledDeletionAt = addWeeks(deletionDate, 1);

      // Only update chats that don't already have a scheduled deletion
      const updated = await db.chat.updateMany({
        where: {
          accommodationPostId: post.id,
          scheduledDeletionAt: null,
        },
        data: {
          scheduledDeletionAt,
        },
      });
      scheduledChatsCount += updated.count;
    }

    // 3. Schedule deletion for chats of expired logistics posts
    const expiredLogisticsPosts = await db.logisticsPost.findMany({
      where: {
        OR: [
          // Posts that are soft-deleted
          {
            isActive: false,
            deletedAt: { not: null },
          },
          // Posts that have expired
          {
            expiresAt: { lte: now },
          },
        ],
      },
      select: { id: true, deletedAt: true, expiresAt: true },
    });

    for (const post of expiredLogisticsPosts) {
      const deletionDate = post.deletedAt || post.expiresAt;
      const scheduledDeletionAt = addWeeks(deletionDate, 1);

      const updated = await db.chat.updateMany({
        where: {
          logisticsPostId: post.id,
          scheduledDeletionAt: null,
        },
        data: {
          scheduledDeletionAt,
        },
      });
      scheduledChatsCount += updated.count;
    }

    return NextResponse.json({
      success: true,
      results: {
        deletedChats: deletedChatsCount,
        deletedMessages: deletedMessagesCount,
        scheduledForDeletion: scheduledChatsCount,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error in cleanup job:', error);
    return NextResponse.json(
      { error: 'Cleanup job failed' },
      { status: 500 }
    );
  }
}

// GET - Check cleanup status (useful for debugging)
export async function GET(request: NextRequest) {
  try {
    // Verify this is an internal call or has proper authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if CRON_SECRET is not set (development) or matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Get counts of items pending cleanup
    const chatsScheduledForDeletion = await db.chat.count({
      where: {
        scheduledDeletionAt: { not: null },
      },
    });

    const chatsReadyForDeletion = await db.chat.count({
      where: {
        scheduledDeletionAt: { lte: now },
      },
    });

    const expiredAccommodationPosts = await db.accommodationPost.count({
      where: {
        OR: [
          { isActive: false },
          { expiresAt: { lte: now } },
        ],
      },
    });

    const expiredLogisticsPosts = await db.logisticsPost.count({
      where: {
        OR: [
          { isActive: false },
          { expiresAt: { lte: now } },
        ],
      },
    });

    return NextResponse.json({
      status: 'ok',
      pending: {
        chatsScheduledForDeletion,
        chatsReadyForDeletion,
        expiredAccommodationPosts,
        expiredLogisticsPosts,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error checking cleanup status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

