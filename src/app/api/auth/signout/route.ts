import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Must pass same options as set() for reliable deletion across all browsers
    cookieStore.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return NextResponse.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { message: 'Failed to sign out' },
      { status: 500 }
    );
  }
}
