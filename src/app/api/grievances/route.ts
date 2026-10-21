import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Restricted access check:
    // Doctors, department staff, and canteen operators are strictly barred from grievance archives
    if (['doctor', 'department_staff', 'canteen_operator'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restricted Access: Confidential staff-behaviour grievances are sealed and accessible only by the Grievance Committee and Dean.',
        },
        { status: 403 }
      );
    }

    const grievances = await localDb.getGrievances(user);
    return NextResponse.json({ success: true, grievances });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch grievances';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { targetDepartmentOrRole, subject, incidentDescription, incidentDate, isAnonymous } = body;

    if (!targetDepartmentOrRole || !subject || !incidentDescription || !incidentDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please fill in all required grievance details (targetDepartmentOrRole, subject, incidentDescription, incidentDate).',
        },
        { status: 400 }
      );
    }

    const grievance = await localDb.createGrievance({
      studentId: user.id,
      studentName: isAnonymous ? 'Anonymous Member' : user.fullName,
      isAnonymous: !!isAnonymous,
      targetDepartmentOrRole: targetDepartmentOrRole.trim(),
      subject: subject.trim(),
      incidentDescription: incidentDescription.trim(),
      incidentDate,
    });

    return NextResponse.json({ success: true, grievance }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to lodge grievance';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
