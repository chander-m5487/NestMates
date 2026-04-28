import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addHours, subDays } from 'date-fns';

/**
 * Cleanup API — handles scheduled deletions and expired posts.
 * Called via Cloud Scheduler (or cron) with CRON_SECRET in Authorization header.
 *
 * Tasks:
 * 1. Hard-delete chats whose scheduledDeletionAt has passed.
 * 2. Schedule deletion for chats linked to expired/deleted accommodation posts.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET is not set — cleanup endpoint is disabled');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let deletedChatsCount = 0;
    let deletedMessagesCount = 0;
    let scheduledChatsCount = 0;
    let deletedPostsCount = 0;

    // 1. Hard-delete chats past their scheduledDeletionAt
    const chatsToDelete = await db.chat.findMany({
      where: { scheduledDeletionAt: { lte: now } },
      select: { id: true },
    });

    if (chatsToDelete.length > 0) {
      const chatIds = chatsToDelete.map(c => c.id);
      const deletedMessages = await db.message.deleteMany({ where: { chatId: { in: chatIds } } });
      deletedMessagesCount = deletedMessages.count;
      const deletedChats = await db.chat.deleteMany({ where: { id: { in: chatIds } } });
      deletedChatsCount = deletedChats.count;
    }

    // 2. For chats linked to expired/deleted posts that haven't been scheduled
    //    for deletion yet: deactivate them immediately and schedule hard-delete
    //    48 hours after the post's deletion/expiry time.
    const expiredPosts = await db.accommodationPost.findMany({
      where: {
        OR: [
          { isActive: false, deletedAt: { not: null } },
          { expiresAt: { lte: now } },
        ],
      },
      select: { id: true, deletedAt: true, expiresAt: true },
    });

    for (const post of expiredPosts) {
      const referenceTime = post.deletedAt ?? post.expiresAt;
      const scheduledDeletionAt = addHours(referenceTime, 48);
      const updated = await db.chat.updateMany({
        where: { accommodationPostId: post.id, scheduledDeletionAt: null },
        data: {
          isActive: false,
          expiresAt: referenceTime,         // expired at same time as post
          scheduledDeletionAt,              // hard-deleted 48 h later
        },
      });
      scheduledChatsCount += updated.count;
    }

    // 3. Hard-delete posts that were soft-deleted more than 90 days ago.
    //    All linked chats/messages are already gone by this point (48h window).
    const cutoff = subDays(now, 90);
    const hardDeletedPosts = await db.accommodationPost.deleteMany({
      where: {
        isActive: false,
        deletedAt: { lte: cutoff },
      },
    });
    deletedPostsCount = hardDeletedPosts.count;

    return NextResponse.json({
      success: true,
      results: {
        deletedChats: deletedChatsCount,
        deletedMessages: deletedMessagesCount,
        scheduledForDeletion: scheduledChatsCount,
        hardDeletedPosts: deletedPostsCount,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error in cleanup job:', error);
    return NextResponse.json({ error: 'Cleanup job failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const chatsScheduledForDeletion = await db.chat.count({ where: { scheduledDeletionAt: { not: null } } });
    const chatsReadyForDeletion = await db.chat.count({ where: { scheduledDeletionAt: { lte: now } } });
    const expiredAccommodationPosts = await db.accommodationPost.count({
      where: { OR: [{ isActive: false }, { expiresAt: { lte: now } }] },
    });

    return NextResponse.json({
      status: 'ok',
      pending: { chatsScheduledForDeletion, chatsReadyForDeletion, expiredAccommodationPosts },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error checking cleanup status:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
