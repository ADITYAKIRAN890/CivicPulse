import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { localDb } from '@/lib/db/local-store';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    return NextResponse.json({
      success: true,
      user: user || null,
      isAuthenticated: Boolean(user),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Switch user persona (for evaluation/demo or switching authenticated session)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const user = await localDb.getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found in campus database' }, { status: 404 });
    }

    const res = NextResponse.json({ success: true, user });
    res.cookies.set(SESSION_COOKIE_NAME, user.id, {
      path: '/',
      httpOnly: false, // accessible to client for smooth UI synchronization
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to set session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
