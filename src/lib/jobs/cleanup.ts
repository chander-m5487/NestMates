/**
 * Cleanup Job - Lifecycle Management for Posts and Chats
 * 
 * This job handles:
 * 1. Deleting expired accommodation posts (after 3 months)
 * 2. Deleting expired logistics posts (after 1 month)
 * 3. Deleting expired chats (1 month after post deletion)
 * 4. Sending expiry notifications (1 month, 1 week, 1 day before)
 * 
 * Run this as a scheduled cron job: npm run cleanup:scheduled
 */

import { db } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';
import { addDays, subDays, subMonths, subWeeks } from 'date-fns';

interface CleanupResult {
  postsDeleted: number;
  chatsDeleted: number;
  notificationsSent: number;
}

/**
 * Main cleanup function
 */
export async function runCleanup(): Promise<CleanupResult> {
  console.log('🧹 Starting cleanup job...');
  
  const result: CleanupResult = {
    postsDeleted: 0,
    chatsDeleted: 0,
    notificationsSent: 0,
  };

  try {
    // 1. Delete expired accommodation posts
    const expiredAccommodation = await deleteExpiredAccommodationPosts();
    result.postsDeleted += expiredAccommodation;

    // 2. Delete expired logistics posts
    const expiredLogistics = await deleteExpiredLogisticsPosts();
    result.postsDeleted += expiredLogistics;

    // 3. Delete expired chats
    const expiredChats = await deleteExpiredChats();
    result.chatsDeleted = expiredChats;

    // 4. Send expiry notifications
    const notifications = await sendExpiryNotifications();
    result.notificationsSent = notifications;

    console.log('✅ Cleanup completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * Delete accommodation posts past their expiry date
 */
async function deleteExpiredAccommodationPosts(): Promise<number> {
  const now = new Date();

  const expiredPosts = await db.accommodationPost.findMany({
    where: {
      isActive: true,
      expiresAt: { lt: now },
    },
    include: {
      user: true,
      chats: true,
    },
  });

  for (const post of expiredPosts) {
    // Update chat expiry dates (1 month after post deletion)
    await db.chat.updateMany({
      where: { accommodationPostId: post.id },
      data: {
        expiresAt: addDays(now, 30),
      },
    });

    // Soft delete the post
    await db.accommodationPost.update({
      where: { id: post.id },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    // Create notification for post owner
    await db.notification.create({
      data: {
        userId: post.userId,
        type: 'POST_DELETED',
        title: 'Your accommodation post has expired',
        message: `Your listing at ${post.formattedAddress} has been removed. Any active chats will remain for 30 more days.`,
        data: { postId: post.id },
      },
    });

    // Log the deletion
    await db.cleanupLog.create({
      data: {
        type: 'accommodation_post',
        recordId: post.id,
        action: 'deleted',
        details: { address: post.formattedAddress },
      },
    });
  }

  return expiredPosts.length;
}

/**
 * Delete logistics posts past their expiry date
 */
async function deleteExpiredLogisticsPosts(): Promise<number> {
  const now = new Date();

  const expiredPosts = await db.logisticsPost.findMany({
    where: {
      isActive: true,
      expiresAt: { lt: now },
    },
    include: {
      user: true,
      chats: true,
    },
  });

  for (const post of expiredPosts) {
    // Update chat expiry dates
    await db.chat.updateMany({
      where: { logisticsPostId: post.id },
      data: {
        expiresAt: addDays(now, 30),
      },
    });

    // Soft delete the post
    await db.logisticsPost.update({
      where: { id: post.id },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: post.userId,
        type: 'POST_DELETED',
        title: 'Your ride share post has expired',
        message: `Your ride from ${post.fromCity} to ${post.toCity} has been removed.`,
        data: { postId: post.id },
      },
    });

    // Log the deletion
    await db.cleanupLog.create({
      data: {
        type: 'logistics_post',
        recordId: post.id,
        action: 'deleted',
        details: { from: post.fromCity, to: post.toCity },
      },
    });
  }

  return expiredPosts.length;
}

/**
 * Delete chats past their expiry date
 */
async function deleteExpiredChats(): Promise<number> {
  const now = new Date();

  const expiredChats = await db.chat.findMany({
    where: {
      isActive: true,
      expiresAt: { lt: now },
    },
    include: {
      owner: true,
      responder: true,
    },
  });

  for (const chat of expiredChats) {
    // Soft delete the chat
    await db.chat.update({
      where: { id: chat.id },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    // Notify both participants
    for (const user of [chat.owner, chat.responder]) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'CHAT_DELETED',
          title: 'Chat conversation has expired',
          message: 'This chat has been removed as the associated post has expired.',
          data: { chatId: chat.id },
        },
      });
    }

    // Log the deletion
    await db.cleanupLog.create({
      data: {
        type: 'chat',
        recordId: chat.id,
        action: 'deleted',
        details: {},
      },
    });
  }

  return expiredChats.length;
}

/**
 * Send expiry notifications at 1 month, 1 week, and 1 day before
 */
async function sendExpiryNotifications(): Promise<number> {
  const now = new Date();
  let notificationCount = 0;

  // Get chats expiring in exactly 30 days, 7 days, and 1 day
  const oneMonth = addDays(now, 30);
  const oneWeek = addDays(now, 7);
  const oneDay = addDays(now, 1);

  // 1 Month notification
  const chatsExpiring1Month = await db.chat.findMany({
    where: {
      isActive: true,
      expiresAt: {
        gte: subDays(oneMonth, 1),
        lt: addDays(oneMonth, 1),
      },
      ownerNotified1Month: false,
    },
    include: {
      owner: true,
      responder: true,
    },
  });

  for (const chat of chatsExpiring1Month) {
    await notifyUser(chat.owner, chat.id, '1 month');
    await notifyUser(chat.responder, chat.id, '1 month');
    
    await db.chat.update({
      where: { id: chat.id },
      data: {
        ownerNotified1Month: true,
        responderNotified1Month: true,
      },
    });
    notificationCount += 2;
  }

  // 1 Week notification
  const chatsExpiring1Week = await db.chat.findMany({
    where: {
      isActive: true,
      expiresAt: {
        gte: subDays(oneWeek, 1),
        lt: addDays(oneWeek, 1),
      },
      ownerNotified1Week: false,
    },
    include: {
      owner: true,
      responder: true,
    },
  });

  for (const chat of chatsExpiring1Week) {
    await notifyUser(chat.owner, chat.id, '1 week');
    await notifyUser(chat.responder, chat.id, '1 week');
    
    await db.chat.update({
      where: { id: chat.id },
      data: {
        ownerNotified1Week: true,
        responderNotified1Week: true,
      },
    });
    notificationCount += 2;
  }

  // 1 Day notification
  const chatsExpiring1Day = await db.chat.findMany({
    where: {
      isActive: true,
      expiresAt: {
        gte: subDays(oneDay, 1),
        lt: addDays(oneDay, 1),
      },
      ownerNotified1Day: false,
    },
    include: {
      owner: true,
      responder: true,
    },
  });

  for (const chat of chatsExpiring1Day) {
    await notifyUser(chat.owner, chat.id, '1 day');
    await notifyUser(chat.responder, chat.id, '1 day');
    
    await db.chat.update({
      where: { id: chat.id },
      data: {
        ownerNotified1Day: true,
        responderNotified1Day: true,
      },
    });
    notificationCount += 2;
  }

  return notificationCount;
}

async function notifyUser(
  user: { id: string; email: string },
  chatId: string,
  timeframe: string
) {
  // Create in-app notification
  await db.notification.create({
    data: {
      userId: user.id,
      type: timeframe === '1 month' 
        ? 'CHAT_EXPIRING_1_MONTH' 
        : timeframe === '1 week' 
          ? 'CHAT_EXPIRING_1_WEEK' 
          : 'CHAT_EXPIRING_1_DAY',
      title: 'Chat expiring soon',
      message: `Your chat conversation will be deleted in ${timeframe}. Save any important information now.`,
      data: { chatId },
    },
  });

  // Send email notification
  try {
    await sendNotificationEmail(
      user.email,
      `Chat Expiring in ${timeframe}`,
      `Your chat conversation on NestMates will be deleted in ${timeframe}. If you haven't exchanged contact information with the other party, please do so now before the chat is removed.`,
      `${process.env.NEXT_PUBLIC_APP_URL}/messages`
    );
  } catch (error) {
    console.error(`Failed to send email to ${user.email}:`, error);
  }
}

// Run if called directly
if (require.main === module) {
  runCleanup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

