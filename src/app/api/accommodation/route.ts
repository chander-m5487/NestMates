import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addMonths, addWeeks } from 'date-fns';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeTitle, sanitizePostContent, sanitizeInput } from '@/lib/security/sanitize';

// GET - Fetch accommodation posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const propertyType = searchParams.get('propertyType');
    const stateId = searchParams.get('stateId');

    const where: Record<string, unknown> = {
      isActive: true,
      expiresAt: { gt: new Date() },
    };

    if (city) where.city = city;
    if (propertyType) where.propertyType = propertyType;
    if (stateId) where.stateId = stateId;

    const posts = await db.accommodationPost.findMany({
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
    console.error('Error fetching accommodation posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new accommodation post
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
    let { title, propertyType, address, city, zipCode, rent, description, stateId } = body;

    // Validation
    if (!title || !propertyType || !address || !city || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize all inputs
    title = sanitizeTitle(title, 50);
    propertyType = sanitizeInput(propertyType);
    address = sanitizeInput(address);
    city = sanitizeInput(city);
    zipCode = zipCode ? sanitizeInput(zipCode) : null;
    description = sanitizePostContent(description);
    
    // Validate rent (optional, but must be positive if provided)
    const rentValue = rent ? parseFloat(rent) : null;
    if (rentValue !== null && (isNaN(rentValue) || rentValue < 0)) {
      return NextResponse.json(
        { error: 'Invalid rent value' },
        { status: 400 }
      );
    }

    // Get stateId from request or default
    let locationId = stateId;
    if (!locationId) {
      const defaultState = await db.state.findFirst({
        where: { code: 'CA' },
      });
      locationId = defaultState?.id;
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'No state selected' },
        { status: 400 }
      );
    }

    // Calculate expiry date (2 months from now)
    const expiresAt = addMonths(new Date(), 2);

    // Create the post
    const post = await db.accommodationPost.create({
      data: {
        title,
        propertyType,
        formattedAddress: address,
        city,
        zipCode: zipCode || null,
        rent: rentValue,
        description,
        stateId: locationId,
        userId: session.id,
        latitude: 0,
        longitude: 0,
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
    console.error('Error creating accommodation post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
