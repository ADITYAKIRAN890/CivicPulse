import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Campus email address is required.' },
        { status: 400 }
      );
    }

    const emailNormalized = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?mode=reset-callback`,
      });
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    } else {
      // Local verification
      const allUsers = await localDb.getUsers();
      const match = allUsers.find((u) => u.email.toLowerCase() === emailNormalized);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'No campus profile found with this email address.' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Password reset verification link sent to ${emailNormalized}. Check your campus inbox.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password reset failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
