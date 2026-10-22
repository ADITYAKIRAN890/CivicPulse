import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser, enforceRole } from '@/lib/auth/session';
import { UserRole } from '@/types';

export async function GET() {
  try {
    const users = await localDb.getUsers();
    const doctors = await localDb.getDoctors();

    const roleCounts: Record<string, number> = {
      total: users.length,
      student: users.filter((u) => u.role === 'student').length,
      doctor: users.filter((u) => u.role === 'doctor').length,
      department_staff: users.filter((u) => u.role === 'department_staff').length,
      grievance_officer: users.filter((u) => u.role === 'grievance_officer').length,
      administrator: users.filter((u) => u.role === 'administrator').length,
      canteen_operator: users.filter((u) => u.role === 'canteen_operator').length,
    };

    return NextResponse.json({
      success: true,
      people: users,
      doctors,
      roleCounts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch people';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    enforceRole(currentUser, ['administrator']);

    const body = await req.json();
    const {
      fullName,
      email,
      role,
      rollNumber,
      department,
      clinicCabin,
      specialization,
      qualification,
      bio,
      consultationHours,
      avatarUrl,
    } = body;

    if (!fullName || !email || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Full name, email address, and role are required to add a person to the database.',
        },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Basic email format check
    if (!emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address (e.g. name@campus.edu).' },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = [
      'student',
      'doctor',
      'department_staff',
      'grievance_officer',
      'administrator',
      'canteen_operator',
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role "${role}". Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await localDb.addPerson({
      fullName: fullName.trim(),
      email: emailTrimmed,
      role,
      rollNumber,
      department,
      clinicCabin,
      specialization,
      qualification,
      bio,
      consultationHours,
      avatarUrl,
    });

    return NextResponse.json(
      {
        success: true,
        person: result.user,
        doctor: result.doctor,
        message: `Successfully added ${result.user.fullName} (${result.user.role.replace(/_/g, ' ')}) to the campus database!`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add person to database';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
