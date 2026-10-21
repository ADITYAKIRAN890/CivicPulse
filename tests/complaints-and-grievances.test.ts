import test from 'node:test';
import assert from 'node:assert/strict';
import { localDb } from '../src/lib/db/local-store';

test('Complaints & Grievances Suite: Lifecycle Transitions, Audit Logs, and Confidentiality Isolation', async (t) => {
  localDb.resetToSeed();

  await t.test('Submits a new complaint with automatic audit log creation', async () => {
    const newComplaint = await localDb.createComplaint({
      title: 'Water Seepage in Library Basement Archives',
      description: 'Heavy water drops leaking onto historic university manuscript shelves.',
      category: 'infrastructure',
      campusZone: 'Central Library',
      locationDetails: 'Basement Archive Rack 4',
      status: 'submitted',
      priority: 'high',
      priorityScore: 78,
      priorityReasons: ['Valuable campus archive protection', 'Water leakage risk'],
      assignedDepartment: 'Campus Estate & Civil Works',
      studentId: 'user-student-1',
      studentName: 'Aarav Sharma',
      isAnonymous: false,
      humanReviewRequired: false,
      pointsAwardedTriage: false,
      pointsAwardedResolution: false,
    });

    assert.ok(newComplaint.id);
    assert.match(newComplaint.referenceCode, /^CMP-2026-/);

    // Verify audit log
    const auditLogs = await localDb.getComplaintAuditLogs(newComplaint.id);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, 'complaint_submitted');
  });

  await t.test('Enforces valid status transitions and rejects invalid jumps', async () => {
    // Attempt invalid jump: submitted -> verified_by_student (skipping triage, progress, and resolution)
    await assert.rejects(
      async () => {
        await localDb.updateComplaintStatus({
          complaintId: 'cmp-004',
          actorId: 'user-student-2',
          newStatus: 'verified_by_student',
        });
      },
      (err: Error) => {
        return err.message.includes('Invalid status transition');
      }
    );
  });

  await t.test('Strict Grievance Isolation: Department staff and doctors cannot access confidential grievances', async () => {
    const deptStaffUser = await localDb.getUserById('user-dept-staff-1');
    assert.ok(deptStaffUser);

    const grievances = await localDb.getGrievances(deptStaffUser);
    assert.equal(grievances.length, 0); // Zero access!

    const doctorUser = await localDb.getUserById('user-doctor-1');
    assert.ok(doctorUser);
    const docGrievances = await localDb.getGrievances(doctorUser);
    assert.equal(docGrievances.length, 0); // Zero access!
  });

  await t.test('Grievance Officer can access all grievances and update investigation hearing notes', async () => {
    const officer = await localDb.getUserById('user-grievance-1');
    assert.ok(officer);

    const allGrievances = await localDb.getGrievances(officer);
    assert.ok(allGrievances.length >= 1);

    const targetGrievance = allGrievances[0];
    const updated = await localDb.updateGrievance({
      grievanceId: targetGrievance.id,
      officerId: officer.id,
      status: 'investigation_active',
      hearingNotes: 'Reviewed CCTV footage of Gate 4. Witness testimonies recorded.',
    });

    assert.equal(updated.status, 'investigation_active');
    assert.match(updated.hearingNotes!, /Reviewed CCTV footage/);
  });
});
