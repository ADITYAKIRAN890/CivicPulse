import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase-client';

export async function POST() {
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }

    const res = NextResponse.json({
      success: true,
      message: 'Signed out successfully.',
    });

    // Clear session cookie completely
    res.cookies.delete(SESSION_COOKIE_NAME);
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'lax',
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
