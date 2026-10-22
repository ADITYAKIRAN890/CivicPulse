import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const complaint = await localDb.getComplaintById(id);
    if (!complaint) {
      return NextResponse.json({ success: false, error: 'Complaint not found' }, { status: 404 });
    }

    const auditLogs = await localDb.getComplaintAuditLogs(id);
    return NextResponse.json({ success: true, complaint, auditLogs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving complaint';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const body = await req.json();

    const {
      status,
      notes,
      resolutionImageUrl,
      assignedStaffId,
      assignedDepartment,
    } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const complaint = await localDb.getComplaintById(id);
    if (!complaint) {
      return NextResponse.json({ success: false, error: 'Complaint not found' }, { status: 404 });
    }

    if (user.role === 'student' && complaint.studentId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access forbidden: You cannot modify another student's complaint." },
        { status: 403 }
      );
    }

    const result = await localDb.updateComplaintStatus({
      complaintId: id,
      actorId: user.id,
      newStatus: status,
      notes,
      resolutionImageUrl,
      assignedStaffId,
      assignedDepartment,
    });

    return NextResponse.json({
      success: true,
      complaint: result.complaint,
      pointsAwarded: result.pointsAwarded,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update complaint';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
