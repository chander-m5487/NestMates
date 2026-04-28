import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addDays } from 'date-fns';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeTitle, sanitizePostContent, sanitizeInput } from '@/lib/security/sanitize';
import { normalizePostCountryAndState } from '@/lib/geo';
import { writeAuditLog } from '@/lib/audit';

// GET - Fetch accommodation posts
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rl = checkRateLimit(clientIP, 'accommodation-list', RATE_LIMITS.API_GENERAL);
    if (!rl.allowed) return rateLimitResponse(rl);
    const { searchParams } = new URL(request.url);

    // Cap free-text filter lengths so a malformed/oversized query can't
    // force expensive table scans. Posts have short addresses; 80 chars is
    // generous for any city/state/country/zip filter.
    const FILTER_MAX_LEN = 80;
    const clip = (raw: string | null) =>
      raw == null ? null : raw.slice(0, FILTER_MAX_LEN).trim() || null;

    const country = clip(searchParams.get('country'));
    const state = clip(searchParams.get('state'));
    const city = clip(searchParams.get('city'));
    const zip = clip(searchParams.get('zip'));
    const propertyType = searchParams.get('propertyType');

    // Rent range filter — cap at 10M (matches POST validation) and silently
    // ignore inverted ranges (min > max) so the user still gets some results
    // instead of a confusing empty list.
    const RENT_MAX = 10_000_000;
    const parseRent = (raw: string | null): number | null => {
      if (raw == null || raw === '') return null;
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n < 0) return null;
      return Math.min(n, RENT_MAX);
    };
    let minRentVal = parseRent(searchParams.get('minRent'));
    let maxRentVal = parseRent(searchParams.get('maxRent'));
    if (minRentVal !== null && maxRentVal !== null && minRentVal > maxRentVal) {
      [minRentVal, maxRentVal] = [maxRentVal, minRentVal];
    }

    // Pagination — newest-first, 15 per page (matches grid: 3 per row × 5 rows)
    const PAGE_SIZE_DEFAULT = 15;
    const PAGE_SIZE_MAX = 50;
    const PAGE_MAX = 10_000; // hard ceiling to prevent OFFSET runaway
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSizeRaw = parseInt(searchParams.get('pageSize') ?? String(PAGE_SIZE_DEFAULT), 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1
      ? Math.min(pageRaw, PAGE_MAX)
      : 1;
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(Math.max(pageSizeRaw, 1), PAGE_SIZE_MAX)
      : PAGE_SIZE_DEFAULT;

    // Allowlist propertyType — only the 4 supported enum values.
    // Validate BEFORE composing the where clause so we reject invalid values
    // up-front instead of running a query with a junk filter.
    const ALLOWED_PROPERTY_TYPES = new Set(['APARTMENT', 'SINGLE_HOME', 'TOWNHOME', 'CONDO']);
    if (propertyType && !ALLOWED_PROPERTY_TYPES.has(propertyType)) {
      return NextResponse.json({ error: 'Invalid property type' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      isActive: true,
      expiresAt: { gt: new Date() },
    };

    if (propertyType) where.propertyType = propertyType;

    // Note: Prisma's `mode: 'insensitive'` is PostgreSQL-only. SQLite's
    // default LIKE is case-insensitive for ASCII via `contains`, and our
    // country/state names come from the shared geo lib so casing is stable.
    // Escape LIKE wildcards in free-text filters to prevent injection.
    const escapeLike = (s: string) => s.replace(/[%_\\]/g, '\\$&');
    if (country) where.country = country;
    if (state) where.state = state;
    if (city) where.city = { contains: escapeLike(city) };
    if (zip) where.zipCode = { contains: escapeLike(zip) };
    if (minRentVal !== null || maxRentVal !== null) {
      const rentFilter: Record<string, number> = {};
      if (minRentVal !== null) rentFilter.gte = minRentVal;
      if (maxRentVal !== null) rentFilter.lte = maxRentVal;
      where.rent = rentFilter;
    }

    const [total, posts] = await Promise.all([
      db.accommodationPost.count({ where }),
      db.accommodationPost.findMany({
        where,
        // newest first; secondary sort on id keeps order stable when timestamps tie
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              uniqueUserId: true,
              displayName: true,
              // email intentionally excluded — not exposed publicly
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
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
    let { title, propertyType, address, city, state, country, zipCode, rent, description, lat, lng, manualPin } = body;

    // Length caps — defense in depth
    const MAX_ADDRESS_LEN = 300;
    const MAX_CITY_LEN = 120;
    const MAX_STATE_LEN = 80;
    const MAX_COUNTRY_LEN = 80;
    const MAX_ZIP_LEN = 20;

    const cap = (s: unknown, n: number): string =>
      typeof s === 'string' ? s.slice(0, n) : '';

    // Sanitize FIRST, then validate — so whitespace-only strings ("   ")
    // are rejected rather than slipping through the pre-sanitize truthy check.
    title = sanitizeTitle(cap(title, 50));
    propertyType = sanitizeInput(cap(propertyType, 30));
    address = sanitizeInput(cap(address, MAX_ADDRESS_LEN));
    description = sanitizePostContent(cap(description, 2000));

    if (!title || !propertyType || !address || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    city = sanitizeInput(cap(city, MAX_CITY_LEN));
    state = state ? sanitizeInput(cap(state, MAX_STATE_LEN)) : null;
    country = country ? sanitizeInput(cap(country, MAX_COUNTRY_LEN)) : null;
    zipCode = zipCode ? sanitizeInput(cap(zipCode, MAX_ZIP_LEN)) : null;

    // Canonicalize country & state against our supported geo allowlist so
    // posts created from a non-English Google Maps locale (or with minor
    // casing differences) still match the country/state filters. Names that
    // aren't in our allowlist are kept as-is so unsupported regions still
    // work as free-text.
    const normalized = normalizePostCountryAndState(country, state);
    country = normalized.country;
    state = normalized.state;
    
    // Rent is now mandatory — must be a positive, finite number within a
    // sane range. Cap at 10M to defend against accidental/malicious extreme
    // values that would distort the rent-range filter UX.
    const RENT_MAX = 10_000_000;
    const rentValue = rent != null && rent !== '' ? parseFloat(String(rent)) : NaN;
    if (!Number.isFinite(rentValue) || rentValue <= 0 || rentValue > RENT_MAX) {
      return NextResponse.json(
        { error: 'Rent is required and must be between 1 and 10,000,000.' },
        { status: 400 }
      );
    }

    // Posts auto-expire after 30 days
    const expiresAt = addDays(new Date(), 30);

    // Coordinates are mandatory — every post must be either Google-resolved
    // or manually pinned. Reject any payload with missing/invalid coords or
    // out-of-range values so we never store (0, 0) ghost posts.
    const latValue = lat != null ? parseFloat(String(lat)) : NaN;
    const lngValue = lng != null ? parseFloat(String(lng)) : NaN;
    if (
      !Number.isFinite(latValue) || !Number.isFinite(lngValue) ||
      latValue < -90 || latValue > 90 ||
      lngValue < -180 || lngValue > 180
    ) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required.' },
        { status: 400 }
      );
    }
    const latitude = latValue;
    const longitude = lngValue;

    // Also enforce propertyType allowlist at write time
    const WRITE_ALLOWED_TYPES = new Set(['APARTMENT', 'SINGLE_HOME', 'TOWNHOME', 'CONDO']);
    if (!WRITE_ALLOWED_TYPES.has(propertyType)) {
      return NextResponse.json({ error: 'Invalid property type' }, { status: 400 });
    }
    const post = await db.accommodationPost.create({
      data: {
        title,
        propertyType,
        formattedAddress: address,
        city,
        state: state || null,
        country: country || null,
        zipCode: zipCode || null,
        rent: rentValue,
        description,
        userId: session.id,
        latitude,
        longitude,
        manualPin: manualPin === true,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            uniqueUserId: true,
            displayName: true,
            // email intentionally excluded — not exposed publicly
          },
        },
      },
    });

    // SC-007: audit log for post creation
    await writeAuditLog({
      userId: session.id,
      action: 'POST_CREATE',
      targetType: 'POST',
      targetId: post.id,
      ipAddress: clientIP, // reuse already-resolved IP
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
