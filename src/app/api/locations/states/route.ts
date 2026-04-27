import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      );
    }

    // Find the country
    const country = await db.country.findUnique({
      where: { code: countryCode.toUpperCase() },
      include: {
        states: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!country) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      country: {
        id: country.id,
        name: country.name,
        code: country.code,
        flag: country.flag,
      },
      states: country.states.map((state) => ({
        id: state.id,
        name: state.name,
        code: state.code,
      })),
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

