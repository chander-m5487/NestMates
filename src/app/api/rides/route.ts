import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addWeeks } from 'date-fns';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeTitle, sanitizePostContent, sanitizeInput } from '@/lib/security/sanitize';

// GET - Fetch logistics/ride posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCity = searchParams.get('fromCity');
    const toCity = searchParams.get('toCity');
    const stateId = searchParams.get('stateId');

    const where: Record<string, unknown> = {
      isActive: true,
      expiresAt: { gt: new Date() },
    };

    if (fromCity) where.fromCity = { contains: fromCity, mode: 'insensitive' };
    if (toCity) where.toCity = { contains: toCity, mode: 'insensitive' };
    if (stateId) where.stateId = stateId;

    const posts = await db.logisticsPost.findMany({
      where,
      orderBy: { travelDate: 'asc' },
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
    console.error('Error fetching logistics posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new logistics post
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
      fromCity,
      toCity,
      travelDate,
      description,
      stateId,
    } = body;

    // Validation
    if (!title || !fromCity || !toCity || !travelDate || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize all inputs
    title = sanitizeTitle(title, 50);
    fromCity = sanitizeInput(fromCity);
    toCity = sanitizeInput(toCity);
    description = sanitizePostContent(description);

    // Get stateId from selection or default
    let locationId = stateId;
    if (!locationId) {
      const stored = await db.state.findFirst({ where: { code: 'CA' } });
      locationId = stored?.id;
    }

    // Calculate expiry date (3 weeks from now)
    const expiresAt = addWeeks(new Date(), 3);

    // Create the post
    const post = await db.logisticsPost.create({
      data: {
        title,
        fromCity,
        fromAddress: fromCity,
        fromLatitude: 0,
        fromLongitude: 0,
        toCity,
        toAddress: toCity,
        toLatitude: 0,
        toLongitude: 0,
        travelDate: new Date(travelDate),
        seatsAvailable: null,
        description,
        stateId: locationId,
        userId: session.id,
        expiresAt,
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
    console.error('Error creating logistics post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
