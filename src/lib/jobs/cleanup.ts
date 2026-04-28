/**
 * Cleanup Job — Lifecycle Management for Posts and Chats
 *
 * Handles:
 * 1. Expiring accommodation posts (soft-delete after 30 days)
 * 2. Hard-deleting old posts (90 days after soft-deletion)
 * 3. Deactivating chats when their post expires (isActive=false immediately)
 * 4. Hard-deleting expired chats (48h after post deletion/expiry)
 * 5. Sending expiry warnings to post owners (7 days and 1 day before listing expires)
 *
 * Run as scheduled Cloud Run Job: npm run cleanup:scheduled
 */

import { db } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';
import { addHours, addDays, subDays } from 'date-fns';

interface CleanupResult {
  postsExpired: number;
  postsHardDeleted: number;
  chatsDeleted: number;
  notificationsSent: number;
}

export async function runCleanup(): Promise<CleanupResult> {
  console.log('Starting cleanup job...');

  const result: CleanupResult = { postsExpired: 0, postsHardDeleted: 0, chatsDeleted: 0, notificationsSent: 0 };

  try {
    result.postsExpired = await expireAccommodationPosts();
    result.postsHardDeleted = await hardDeleteOldPosts();
    result.chatsDeleted = await deleteExpiredChats();
    result.notificationsSent = await sendExpiryNotifications();

    console.log('Cleanup completed:', result);
    return result;
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

async function expireAccommodationPosts(): Promise<number> {
  const now = new Date();

  const expiredPosts = await db.accommodationPost.findMany({
    where: { isActive: true, expiresAt: { lt: now } },
    include: { user: true, chats: true },
  });

  for (const post of expiredPosts) {
    // Mark the post inactive
    await db.accommodationPost.update({
      where: { id: post.id },
      data: { isActive: false, deletedAt: now },
    });

    // Immediately deactivate all chats; cron hard-deletes them 48 h later
    await db.chat.updateMany({
      where: { accommodationPostId: post.id },
      data: {
        isActive: false,
        expiresAt: now,                      // chat expired with the post
        scheduledDeletionAt: addHours(now, 48), // hard-deleted 48 h from now
      },
    });

    await db.notification.create({
      data: {
        userId: post.userId,
        type: 'POST_DELETED',
        title: 'Your accommodation listing has expired',
        message: `Your listing at ${post.formattedAddress} has expired. Related chats will be permanently deleted in 48 hours.`,
        data: JSON.stringify({ postId: post.id }),
      },
    });

    await db.cleanupLog.create({
      data: {
        type: 'accommodation_post',
        recordId: post.id,
        action: 'expired',
        details: JSON.stringify({ address: post.formattedAddress }),
      },
    });
  }

  return expiredPosts.length;
}

async function hardDeleteOldPosts(): Promise<number> {
  // Hard-delete posts that were soft-deleted more than 90 days ago.
  // By this point all linked chats and messages are long gone (48h window).
  const cutoff = subDays(new Date(), 90);
  const result = await db.accommodationPost.deleteMany({
    where: { isActive: false, deletedAt: { lte: cutoff } },
  });

  if (result.count > 0) {
    await db.cleanupLog.create({
      data: {
        type: 'accommodation_post',
        recordId: 'batch',
        action: 'hard_deleted',
        details: JSON.stringify({ count: result.count, cutoffDays: 90 }),
      },
    });
  }

  return result.count;
}

async function deleteExpiredChats(): Promise<number> {
  const now = new Date();

  // Hard-delete chats (and their messages) whose scheduledDeletionAt has passed.
  // These were either manually deleted posts (set immediately) or auto-expired
  // posts (set 48 h after expiry by deleteExpiredAccommodationPosts above).
  const chatsToDelete = await db.chat.findMany({
    where: { scheduledDeletionAt: { lte: now } },
    include: {
      owner: { select: { id: true, email: true } },
      responder: { select: { id: true, email: true } },
    },
  });

  for (const chat of chatsToDelete) {
    await db.message.deleteMany({ where: { chatId: chat.id } });
    await db.chat.delete({ where: { id: chat.id } });

    for (const user of [chat.owner, chat.responder]) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'CHAT_DELETED',
          title: 'Chat conversation deleted',
          message: 'A chat related to an expired listing has been permanently removed.',
          data: JSON.stringify({ chatId: chat.id }),
        },
      });
    }

    await db.cleanupLog.create({
      data: { type: 'chat', recordId: chat.id, action: 'hard_deleted', details: null },
    });
  }

  return chatsToDelete.length;
}

async function sendExpiryNotifications(): Promise<number> {
  const now = new Date();
  let notificationCount = 0;

  // Warn post owners that their listing is expiring soon (and that chats will
  // be deleted 48 h after expiry). Two windows: 7 days and 1 day in advance.
  const windows = [
    { days: 7, field: 'ownerNotified1Week' as const, label: '7 days' },
    { days: 1, field: 'ownerNotified1Day'  as const, label: '1 day'  },
  ];

  for (const { days, field, label } of windows) {
    const windowStart = addDays(now, days);
    const windowEnd   = addDays(now, days + 1);

    const posts = await db.accommodationPost.findMany({
      where: {
        isActive: true,
        expiresAt: { gte: windowStart, lt: windowEnd },
        [field]: false,
      },
      include: { user: true },
    });

    for (const post of posts) {
      await db.notification.create({
        data: {
          userId: post.userId,
          type: days === 7 ? 'POST_EXPIRING_1_WEEK' : 'POST_EXPIRING_1_DAY',
          title: `Your listing expires in ${label}`,
          message: `Your listing at ${post.formattedAddress} will expire in ${label}. Once expired, all related chats will be deleted within 48 hours.`,
          data: JSON.stringify({ postId: post.id }),
        },
      });

      try {
        await sendNotificationEmail(
          post.user.email,
          `Your NestMates listing expires in ${label}`,
          `Your listing at ${post.formattedAddress} will expire in ${label}. After it expires, all related chats will be permanently deleted within 48 hours.`,
          `${process.env.NEXT_PUBLIC_APP_URL}/my-posts`
        );
      } catch (err) {
        console.error(`Failed to send expiry email to ${post.user.email}:`, err);
      }

      await db.accommodationPost.update({
        where: { id: post.id },
        data: { [field]: true },
      });

      notificationCount++;
    }
  }

  return notificationCount;
}

if (require.main === module) {
  runCleanup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
