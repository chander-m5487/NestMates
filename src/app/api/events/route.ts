import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeTitle, sanitizePostContent, sanitizeInput } from '@/lib/security/sanitize';

// GET - Fetch event posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const stateId = searchParams.get('stateId');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (eventType) where.eventType = eventType;
    if (stateId) where.stateId = stateId;

    const posts = await db.eventPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
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

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching event posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new event post
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'create-post', RATE_LIMITS.API_CREATE_POST);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    let {
      title,
      description,
      eventType,
      eventDate,
      city,
      venue,
      contactInfo,
      stateId,
    } = body;

    // Validation
    if (!title || !description || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize all inputs
    title = sanitizeTitle(title, 100);
    description = sanitizePostContent(description);
    eventType = sanitizeInput(eventType);
    city = city ? sanitizeInput(city) : null;
    venue = venue ? sanitizeInput(venue) : null;
    contactInfo = contactInfo ? sanitizeInput(contactInfo) : null;

    // Get stateId from selection or default
    let locationId = stateId;
    if (!locationId) {
      const stored = await db.state.findFirst({ where: { code: 'CA' } });
      locationId = stored?.id;
    }

    // Create the post
    const post = await db.eventPost.create({
      data: {
        title,
        description,
        eventType,
        eventDate: eventDate ? new Date(eventDate) : null,
        city: city || null,
        venue: venue || null,
        contactInfo: contactInfo || null,
        stateId: locationId,
        userId: session.id,
      },
      include: {
        user: {
          select: {
            uniqueUserId: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating event post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
