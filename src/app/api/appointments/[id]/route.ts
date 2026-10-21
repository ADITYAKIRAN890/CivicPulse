import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const appointment = await localDb.getAppointmentById(id);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, appointment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving appointment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const body = await req.json();

    const { action, status, reason, newDate, newTimeSlot } = body;

    if (action === 'reschedule') {
      if (!newDate || !newTimeSlot) {
        return NextResponse.json(
          { success: false, error: 'New date and time slot required for rescheduling.' },
          { status: 400 }
        );
      }
      const updated = await localDb.rescheduleAppointment(id, user.id, newDate, newTimeSlot);
      return NextResponse.json({ success: true, appointment: updated });
    }

    if (status) {
      const updated = await localDb.updateAppointmentStatus(id, user.id, status, reason);
      return NextResponse.json({ success: true, appointment: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid update action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update appointment';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get('reason') || 'Cancelled by user';

    const cancelStatus = user.role === 'doctor' ? 'cancelled_by_doctor' : 'cancelled_by_student';
    const updated = await localDb.updateAppointmentStatus(id, user.id, cancelStatus, reason);

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel appointment';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
