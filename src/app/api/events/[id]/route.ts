import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// DELETE - Soft delete an event post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const postId = params.id;

    // Find the post and verify ownership
    const post = await db.eventPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.userId !== session.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Soft delete the post
    await db.eventPost.update({
      where: { id: postId },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting event post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}

// GET - Fetch a single event post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await db.eventPost.findUnique({
      where: {
        id: params.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            uniqueUserId: true,
            displayName: true,
            email: true,
          },
        },
        state: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching event post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

