import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addWeeks } from 'date-fns';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const post = await db.logisticsPost.findUnique({ where: { id: postId } });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.userId !== session.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 });
    }

    const now = new Date();
    const chatDeletionDate = addWeeks(now, 1);

    await db.logisticsPost.update({
      where: { id: postId },
      data: { isActive: false, deletedAt: now },
    });

    await db.chat.updateMany({
      where: { logisticsPostId: postId },
      data: { scheduledDeletionAt: chatDeletionDate },
    });

    return NextResponse.json({ success: true, message: 'Post deleted successfully. Related chats will be deleted in 1 week.' });
  } catch (error) {
    console.error('Error deleting rides post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await db.logisticsPost.findUnique({
      where: { id, isActive: true },
      include: {
        user: { select: { id: true, uniqueUserId: true, displayName: true, email: true } },
        state: { include: { country: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching rides post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
