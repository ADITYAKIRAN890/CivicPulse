import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser, enforceRole } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    enforceRole(user, ['grievance_officer', 'administrator']);

    const { id } = await context.params;
    const body = await req.json();

    const {
      status,
      hearingScheduledDate,
      hearingNotes,
      confidentialResolutionSummary,
    } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const updated = await localDb.updateGrievance({
      grievanceId: id,
      officerId: user.id,
      status,
      hearingScheduledDate,
      hearingNotes,
      confidentialResolutionSummary,
    });

    return NextResponse.json({ success: true, grievance: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update grievance';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
