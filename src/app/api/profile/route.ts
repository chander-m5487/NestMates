import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limiter';

const SMOKING_VALID   = ['NEVER', 'OCCASIONALLY', 'REGULARLY'];
const DRINKING_VALID  = ['NEVER', 'OCCASIONALLY', 'REGULARLY'];
const DIETARY_VALID   = ['VEG', 'NON_VEG', 'EGGETARIAN', 'VEGAN', 'OTHER'];
const GENDER_VALID    = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER'];

function sanitizeShortText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().slice(0, maxLen);
  return t || null;
}

// GET /api/profile — returns the current user's own profile
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rl = checkRateLimit(clientIP, 'profile-get', RATE_LIMITS.API_GENERAL);
  if (!rl.allowed) return rateLimitResponse(rl);

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await db.userProfile.findUnique({ where: { userId: session.id } });
  return NextResponse.json({ profile: profile ?? null });
}

// PUT /api/profile — upsert the current user's profile
export async function PUT(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rl = checkRateLimit(clientIP, 'profile-put', RATE_LIMITS.API_GENERAL);
  if (!rl.allowed) return rateLimitResponse(rl);

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // --- Validate & sanitize each field ---
  const errors: string[] = [];

  const smoking  = body.smoking  != null ? String(body.smoking).toUpperCase()  : null;
  const drinking = body.drinking != null ? String(body.drinking).toUpperCase() : null;
  const dietary  = body.dietary  != null ? String(body.dietary).toUpperCase()  : null;
  const gender   = body.gender   != null ? String(body.gender).toUpperCase()   : null;

  if (smoking  && !SMOKING_VALID.includes(smoking))   errors.push('Invalid smoking value');
  if (drinking && !DRINKING_VALID.includes(drinking)) errors.push('Invalid drinking value');
  if (dietary  && !DIETARY_VALID.includes(dietary))   errors.push('Invalid dietary value');
  if (gender   && !GENDER_VALID.includes(gender))     errors.push('Invalid gender value');

  const ethnicity = sanitizeShortText(body.ethnicity, 80);
  const bio       = sanitizeShortText(body.bio, 300);

  let dateOfBirth: Date | null = null;
  if (body.dateOfBirth != null && body.dateOfBirth !== '') {
    const d = new Date(String(body.dateOfBirth));
    if (isNaN(d.getTime())) {
      errors.push('Invalid date of birth');
    } else {
      const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 13 || age > 120) errors.push('Date of birth out of range');
      else dateOfBirth = d;
    }
  }

  // Server-side enforcement of mandatory fields. Client validates too, but
  // this prevents a direct API call from creating an empty profile row and
  // bypassing the mandatory setup dialog.
  if (!smoking)    errors.push('Smoking is required');
  if (!drinking)   errors.push('Drinking is required');
  if (!dietary)    errors.push('Dietary preference is required');
  if (!gender)     errors.push('Gender is required');
  // dateOfBirth: required only when not already flagged invalid above
  if (!dateOfBirth && !errors.some((e) => e.toLowerCase().includes('date of birth'))) {
    errors.push('Date of birth is required');
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 422 });
  }

  const profile = await db.userProfile.upsert({
    where:  { userId: session.id },
    create: { userId: session.id, smoking, drinking, dietary, gender, ethnicity, bio, dateOfBirth },
    update: { smoking, drinking, dietary, gender, ethnicity, bio, dateOfBirth },
  });

  return NextResponse.json({ profile });
}
