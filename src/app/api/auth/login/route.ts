import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { SESSION_COOKIE_NAME, getDashboardRouteForRole } from '@/lib/auth/session';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Campus institutional email is required.' },
        { status: 400 }
      );
    }

    const emailNormalized = email.trim().toLowerCase();

    // 1. Supabase Auth authentication if live Supabase project is connected
    let authenticatedUserId: string | null = null;
    let trustedUserRecord = null;

    if (isSupabaseConfigured && supabase && password) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password,
      });

      if (!authError && authData.user) {
        authenticatedUserId = authData.user.id;
        // Fetch role and details from Supabase trusted profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authenticatedUserId)
          .single();

        if (profile) {
          trustedUserRecord = {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: profile.role,
            rollNumber: profile.roll_number,
            department: profile.department,
            clinicCabin: profile.clinic_cabin,
            avatarUrl: profile.avatar_url,
            isApproved: profile.is_approved,
            createdAt: profile.created_at,
          };
        }
      }
    }

    // 2. Local Database lookup (for local zero-budget mode or fallback)
    if (!trustedUserRecord) {
      const allUsers = await localDb.getUsers();
      const match = allUsers.find((u) => u.email.toLowerCase() === emailNormalized);

      if (!match) {
        return NextResponse.json(
          {
            success: false,
            error: `No campus account found for "${emailNormalized}". Please verify your email or register as a student.`,
          },
          { status: 401 }
        );
      }

      trustedUserRecord = match;
    }

    // 3. Approval status check
    if (!trustedUserRecord.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account enrollment is pending administrative approval by the Dean.',
        },
        { status: 403 }
      );
    }

    // 4. Authoritative Role and Redirect Target:
    // ROLE IS RETRIEVED STRICTLY FROM THE TRUSTED DATABASE RELATIONSHIP.
    // ANY ROLE SENT BY THE FRONTEND IS COMPLETELY IGNORED.
    const authoritativeRole = trustedUserRecord.role;
    const redirectTo = getDashboardRouteForRole(authoritativeRole);

    // 5. Establish secure session
    const res = NextResponse.json({
      success: true,
      user: trustedUserRecord,
      redirectTo,
      message: `Signed in as ${trustedUserRecord.fullName} (${authoritativeRole.replace(/_/g, ' ')})`,
    });

    res.cookies.set(SESSION_COOKIE_NAME, trustedUserRecord.id, {
      path: '/',
      httpOnly: false, // Accessible for client-side UI hydration
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
