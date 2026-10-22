import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser, enforceRole } from '@/lib/auth/session';

export async function GET() {
  try {
    const doctors = await localDb.getDoctors();
    return NextResponse.json({ success: true, doctors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch doctors';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Block, unblock date or update schedule for doctor
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    enforceRole(currentUser, ['doctor', 'administrator']);

    const body = await req.json();
    const { doctorId, date, action, updates } = body;

    if (!doctorId) {
      return NextResponse.json({ success: false, error: 'Doctor ID required' }, { status: 400 });
    }

    const doctors = await localDb.getDoctors();
    const targetDoc = doctors.find((d) => d.id === doctorId);
    if (!targetDoc) {
      return NextResponse.json({ success: false, error: 'Doctor not found' }, { status: 404 });
    }

    // Role security check: Doctor can only update their own record
    if (currentUser.role === 'doctor' && targetDoc.userId !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only manage your own doctor schedule.' },
        { status: 403 }
      );
    }

    let updatedDoctor;
    if (action === 'unblock') {
      if (!date) return NextResponse.json({ success: false, error: 'Date required to unblock' }, { status: 400 });
      updatedDoctor = await localDb.unblockDoctorDate(doctorId, date);
    } else if (action === 'block') {
      if (!date) return NextResponse.json({ success: false, error: 'Date required to block' }, { status: 400 });
      updatedDoctor = await localDb.blockDoctorDate(doctorId, date);
    } else if (action === 'update_schedule') {
      if (!updates) return NextResponse.json({ success: false, error: 'Updates payload required' }, { status: 400 });
      updatedDoctor = await localDb.updateDoctorSchedule(doctorId, updates);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, doctor: updatedDoctor });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update doctor schedule';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
