import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addHours } from 'date-fns';
import { writeAuditLog } from '@/lib/audit';
import { getClientIP } from '@/lib/security/rate-limiter';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = getClientIP(request);
  try {
    const { id: postId } = await params;
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const post = await db.accommodationPost.findUnique({ where: { id: postId } });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.userId !== session.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 });
    }

    const now = new Date();
    const chatDeletionDate = addHours(now, 48);

    // Immediately deactivate the post and its chats; chats are hard-deleted
    // by the cleanup cron 48 hours later.
    await db.accommodationPost.update({
      where: { id: postId },
      data: { isActive: false, deletedAt: now },
    });

    await db.chat.updateMany({
      where: { accommodationPostId: postId },
      data: {
        isActive: false,
        expiresAt: now,                     // expired immediately with the post
        scheduledDeletionAt: chatDeletionDate, // hard-deleted 48 h later by cron
      },
    });

    // SC-007: audit log for post deletion
    await writeAuditLog({
      userId: session.id,
      action: 'POST_DELETE',
      targetType: 'POST',
      targetId: postId,
      ipAddress: clientIP,
    });

    return NextResponse.json({ success: true, message: 'Post deleted. Related chats will be deleted in 48 hours.' });
  } catch (error) {
    console.error('Error deleting accommodation post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await db.accommodationPost.findUnique({
      where: { id, isActive: true },
      include: {
        user: { select: { id: true, uniqueUserId: true, displayName: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching accommodation post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
