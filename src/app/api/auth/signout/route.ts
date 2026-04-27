import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    cookies().delete('auth-token');
    return NextResponse.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { message: 'Failed to sign out' },
      { status: 500 }
    );
  }
}

