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

// Block or unblock date for doctor
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    enforceRole(currentUser, ['doctor', 'administrator']);

    const body = await req.json();
    const { doctorId, date, action } = body;

    if (!doctorId || !date) {
      return NextResponse.json({ success: false, error: 'Doctor ID and date required' }, { status: 400 });
    }

    let updatedDoctor;
    if (action === 'unblock') {
      updatedDoctor = await localDb.unblockDoctorDate(doctorId, date);
    } else {
      updatedDoctor = await localDb.blockDoctorDate(doctorId, date);
    }

    return NextResponse.json({ success: true, doctor: updatedDoctor });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update doctor schedule';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
