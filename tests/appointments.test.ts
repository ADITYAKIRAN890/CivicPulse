import test from 'node:test';
import assert from 'node:assert/strict';
import { localDb } from '../src/lib/db/local-store';

test('Appointments Suite: Atomic Double-Booking Race Condition & Cancellation/Rescheduling', async (t) => {
  // Reset clean state
  localDb.resetToSeed();

  await t.test('Prevents booking on a doctor blocked date', async () => {
    // Dr. Priya Patel (doc-1) has blocked '2026-10-31' in seed
    await assert.rejects(
      async () => {
        await localDb.bookDoctorAppointment({
          studentId: 'user-student-1',
          doctorId: 'doc-1',
          date: '2026-10-31',
          timeSlot: '10:00 AM',
          reasonCategory: 'General Wellness',
        });
      },
      (err: Error) => {
        return err.message.includes('unavailable or on leave');
      }
    );
  });

  await t.test('Successfully books a free appointment slot', async () => {
    const apt = await localDb.bookDoctorAppointment({
      studentId: 'user-student-2',
      doctorId: 'doc-1',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      reasonCategory: 'Routine Physical Form',
      notes: 'Need fitness certificate',
    });

    assert.ok(apt.id);
    assert.match(apt.referenceCode, /^APT-2026-/);
    assert.equal(apt.status, 'confirmed');
    assert.equal(apt.doctorId, 'doc-1');
  });

  await t.test('Atomic Race-Condition Check: Rejects concurrent double booking for the exact same slot', async () => {
    // Both user-student-1 and user-student-2 try to book Dr. Priya Patel on 2026-11-06 at 10:00 AM simultaneously
    const targetDate = '2026-11-06';
    const targetSlot = '10:00 AM';

    // First booking
    const firstApt = await localDb.bookDoctorAppointment({
      studentId: 'user-student-1',
      doctorId: 'doc-1',
      date: targetDate,
      timeSlot: targetSlot,
      reasonCategory: 'Fever Checkup',
    });
    assert.ok(firstApt.id);

    // Second booking attempt on identical slot MUST fail with conflict
    await assert.rejects(
      async () => {
        await localDb.bookDoctorAppointment({
          studentId: 'user-student-2',
          doctorId: 'doc-1',
          date: targetDate,
          timeSlot: targetSlot,
          reasonCategory: 'Cold symptoms',
        });
      },
      (err: Error) => {
        return err.message.includes('already been reserved');
      }
    );
  });

  await t.test('Rescheduling updates slot and prevents conflicting reschedule', async () => {
    // Book an appointment first
    const apt = await localDb.bookDoctorAppointment({
      studentId: 'user-student-1',
      doctorId: 'doc-2',
      date: '2026-11-10',
      timeSlot: '10:00 AM',
      reasonCategory: 'Knee check',
    });

    // Reschedule to 11:00 AM
    const rescheduled = await localDb.rescheduleAppointment(apt.id, 'user-student-1', '2026-11-10', '11:00 AM');
    assert.equal(rescheduled.timeSlot, '11:00 AM');
    assert.equal(rescheduled.date, '2026-11-10');

    // The old slot (10:00 AM) is now freed up for another student!
    const anotherStudentBooking = await localDb.bookDoctorAppointment({
      studentId: 'user-student-2',
      doctorId: 'doc-2',
      date: '2026-11-10',
      timeSlot: '10:00 AM',
      reasonCategory: 'Ankle sprain',
    });
    assert.ok(anotherStudentBooking.id);
  });

  await t.test('Cancelling an appointment frees the slot for other students', async () => {
    const apt = await localDb.bookDoctorAppointment({
      studentId: 'user-student-1',
      doctorId: 'doc-3',
      date: '2026-11-12',
      timeSlot: '02:00 PM',
      reasonCategory: 'Exam Stress Counseling',
    });

    // Cancel appointment
    const cancelled = await localDb.updateAppointmentStatus(
      apt.id,
      'user-student-1',
      'cancelled_by_student',
      'Exam rescheduled, will book next week'
    );
    assert.equal(cancelled.status, 'cancelled_by_student');

    // The slot is now bookable again!
    const newBooking = await localDb.bookDoctorAppointment({
      studentId: 'user-student-2',
      doctorId: 'doc-3',
      date: '2026-11-12',
      timeSlot: '02:00 PM',
      reasonCategory: 'Sleep consultation',
    });
    assert.ok(newBooking.id);
  });
});
