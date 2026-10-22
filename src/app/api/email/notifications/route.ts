import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { localDb } from '@/lib/db/local-store';
import { sendComplaintEmailNotification } from '@/lib/email/resend-service';

/**
 * GET /api/email/notifications
 * Lists complaint email notification audit records.
 * Accessible to authenticated users (filtered by role / permissions).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('complaintId') || undefined;

    let notifications = await localDb.getEmailNotifications(complaintId);

    // If department staff, filter to their assigned department
    if (user.role === 'department_staff' && user.department) {
      notifications = notifications.filter((n) => n.intendedDepartment === user.department);
    } else if (user.role === 'student') {
      // Students can only see notification status for complaints they created
      const studentComplaints = await localDb.getComplaints({ studentId: user.id });
      const studentComplaintIds = new Set(studentComplaints.map((c) => c.id));
      notifications = notifications.filter((n) => studentComplaintIds.has(n.complaintId));
    }

    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve email notifications';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/email/notifications
 * Retries dispatching a failed complaint email notification.
 * Restricted to administrators and department staff.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'administrator' && user.role !== 'department_staff') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators and staff can retry notifications.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { complaintId } = body;

    if (!complaintId) {
      return NextResponse.json(
        { success: false, error: 'complaintId is required.' },
        { status: 400 }
      );
    }

    const complaint = await localDb.getComplaintById(complaintId);
    if (!complaint) {
      return NextResponse.json(
        { success: false, error: 'Complaint not found.' },
        { status: 404 }
      );
    }

    // Attempt re-dispatch
    const result = await sendComplaintEmailNotification(complaint);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      resendId: result.resendId,
      error: result.error,
      notification: result.notification,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retry notification';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
