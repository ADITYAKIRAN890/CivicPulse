import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, rollNumber, department } = body;

    if (!email || !fullName) {
      return NextResponse.json({ success: false, error: 'Email and full name are required' }, { status: 400 });
    }

    const emailTrimmed = email.trim().toLowerCase();
    // Validate college email domain
    const isValidCampusEmail =
      emailTrimmed.endsWith('.edu') ||
      emailTrimmed.endsWith('.ac.in') ||
      emailTrimmed.includes('campus') ||
      emailTrimmed.includes('college') ||
      emailTrimmed.endsWith('.org');

    if (!isValidCampusEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid college/university institutional email address (e.g. name@campus.edu or name@college.ac.in).',
        },
        { status: 400 }
      );
    }

    // Role is strictly locked to student during public enrollment. Never allow self-assigned privilege!
    const newUser = await localDb.createUser({
      email: emailTrimmed,
      fullName: fullName.trim(),
      role: 'student',
      rollNumber: rollNumber ? rollNumber.trim().toUpperCase() : `CS${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      department: department || 'General Engineering & Applied Sciences',
      isApproved: true, // auto-approved for valid student domain in MVP demo
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
    });

    const res = NextResponse.json({ success: true, user: newUser });
    res.cookies.set(SESSION_COOKIE_NAME, newUser.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
