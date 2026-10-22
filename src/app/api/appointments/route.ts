import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const doctorId = searchParams.get('doctorId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');
    const status = searchParams.get('status') as any;
    const search = searchParams.get('search');
    const availabilityOnly = searchParams.get('availabilityOnly') === 'true';

    // If querying public slot availability for a doctor on a specific date:
    if (availabilityOnly && doctorId && date) {
      const docApts = await localDb.getAppointments({ doctorId, date });
      const reservedSlots = docApts
        .filter((a) => !['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status))
        .map((a) => a.timeSlot);
      return NextResponse.json({ success: true, reservedSlots });
    }

    let filters: { doctorId?: string; studentId?: string; date?: string; status?: any; search?: string } = {};

    if (user.role === 'student') {
      filters.studentId = user.id;
    } else if (user.role === 'doctor') {
      const doctors = await localDb.getDoctors();
      const myDoctorProfile = doctors.find((d) => d.userId === user.id);
      if (myDoctorProfile) {
        filters.doctorId = myDoctorProfile.id;
      } else {
        return NextResponse.json({ success: true, appointments: [] });
      }
    } else if (user.role === 'administrator') {
      if (doctorId) filters.doctorId = doctorId;
      if (studentId) filters.studentId = studentId;
    } else {
      // Unrelated roles (canteen_operator, department_staff, grievance_officer) have no access to medical appointments
      return NextResponse.json(
        { success: false, error: 'Access forbidden: unauthorized role for clinical appointments.' },
        { status: 403 }
      );
    }

    if (date) filters.date = date;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const appointments = await localDb.getAppointments(filters);
    return NextResponse.json({ success: true, appointments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch appointments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { doctorId, date, timeSlot, reasonCategory, notes, studentId } = body;

    if (!doctorId || !date || !timeSlot || !reasonCategory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required appointment booking details (doctorId, date, timeSlot, reasonCategory).',
        },
        { status: 400 }
      );
    }

    // Determine booking student ID
    const effectiveStudentId = user.role === 'student' ? user.id : (studentId || user.id);

    const appointment = await localDb.bookDoctorAppointment({
      studentId: effectiveStudentId,
      doctorId,
      date,
      timeSlot,
      reasonCategory,
      notes,
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Appointment booking failed';
    const isConflict = message.toLowerCase().includes('already been reserved') || message.toLowerCase().includes('conflict');
    return NextResponse.json(
      { success: false, error: message },
      { status: isConflict ? 409 : 400 }
    );
  }
}
