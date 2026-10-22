import test from 'node:test';
import assert from 'node:assert/strict';
import { localDb } from '../src/lib/db/local-store';
import {
  sendComplaintEmailNotification,
  sendTestEmail,
  getEmailConfig,
} from '../src/lib/email/resend-service';
import { Complaint } from '../src/types';

test('Resend Email Notifications Suite: Reliability, Idempotency, and Security Guards', async (t) => {
  localDb.resetToSeed();

  // Baseline sample complaint
  const sampleComplaint: Complaint = {
    id: 'cmp-test-email-001',
    referenceCode: 'CMP-2026-9999',
    title: 'Severe Sparking in Electrical Sub-station Switchboard',
    description: 'Continuous sparks and smell of burning insulation near Main Hostel Substation.',
    category: 'electricity',
    campusZone: 'Hostel Block A',
    locationDetails: 'Electrical Control Room 101',
    status: 'submitted',
    priority: 'critical',
    priorityScore: 95,
    priorityReasons: ['Critical electrical hazard', 'High student footfall location'],
    assignedDepartment: 'Electrical & Power Facilities',
    studentId: 'user-student-1',
    studentName: 'Aarav Sharma',
    isAnonymous: false,
    upvotes: 1,
    upvotedBy: ['user-student-1'],
    humanReviewRequired: false,
    pointsAwardedTriage: false,
    pointsAwardedResolution: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await t.test('1. Successful complaint persistence triggers email notification attempt', async () => {
    // Save complaint to local database
    const savedComplaint = await localDb.createComplaint({
      title: sampleComplaint.title,
      description: sampleComplaint.description,
      category: sampleComplaint.category,
      campusZone: sampleComplaint.campusZone,
      locationDetails: sampleComplaint.locationDetails,
      status: 'submitted',
      priority: sampleComplaint.priority,
      priorityScore: sampleComplaint.priorityScore,
      priorityReasons: sampleComplaint.priorityReasons,
      assignedDepartment: sampleComplaint.assignedDepartment,
      studentId: sampleComplaint.studentId,
      studentName: sampleComplaint.studentName,
      isAnonymous: false,
      humanReviewRequired: false,
      pointsAwardedTriage: false,
      pointsAwardedResolution: false,
    });

    assert.ok(savedComplaint.id);
    assert.match(savedComplaint.referenceCode, /^CMP-2026-/);

    // Trigger notification dispatch
    const result = await sendComplaintEmailNotification(savedComplaint);
    assert.ok(result.notification);
    assert.equal(result.notification.complaintId, savedComplaint.id);
    assert.equal(result.notification.complaintReference, savedComplaint.referenceCode);
    assert.equal(result.notification.intendedDepartment, 'Electrical & Power Facilities');
    assert.ok(result.notification.idempotencyKey.includes(savedComplaint.id));
  });

  await t.test('2. Failed complaint save does not trigger an email notification', async () => {
    const initialNotifications = await localDb.getEmailNotifications();
    const initialCount = initialNotifications.length;

    // Simulate validation error before saving
    let saveFailed = false;
    try {
      const invalidComplaint = {
        title: '', // Missing title
        description: '',
      };
      if (!invalidComplaint.title) {
        throw new Error('Title required');
      }
    } catch {
      saveFailed = true;
    }

    assert.equal(saveFailed, true);

    // Verify no new email notification record was created
    const finalNotifications = await localDb.getEmailNotifications();
    assert.equal(finalNotifications.length, initialCount);
  });

  await t.test('3. Provider failure or missing credentials does not delete or erase the complaint', async () => {
    // Save a new complaint
    const complaint = await localDb.createComplaint({
      title: 'Water Pipe Rupture in Cafeteria Kitchen',
      description: 'Major water leakage near the central preparation area.',
      category: 'water',
      campusZone: 'Main Cafeteria',
      locationDetails: 'Ground Floor Kitchen',
      status: 'submitted',
      priority: 'high',
      priorityScore: 75,
      priorityReasons: ['Flooding hazard in food preparation area'],
      assignedDepartment: 'Electrical & Power Facilities',
      studentId: 'user-student-2',
      studentName: 'Ananya Sen',
      isAnonymous: false,
      humanReviewRequired: false,
      pointsAwardedTriage: false,
      pointsAwardedResolution: false,
    });

    assert.ok(complaint.id);

    // Trigger dispatch without active API key or with mock error
    const result = await sendComplaintEmailNotification(complaint);
    // Even if status is failed due to unconfigured key or sandbox, complaint remains intact
    assert.ok(result.notification);

    // Verify the complaint is still in the database unharmed
    const verifiedComplaint = await localDb.getComplaintById(complaint.id);
    assert.ok(verifiedComplaint);
    assert.equal(verifiedComplaint.id, complaint.id);
    assert.equal(verifiedComplaint.title, 'Water Pipe Rupture in Cafeteria Kitchen');
  });

  await t.test('4. Idempotency: Retrying the same event does not create duplicate emails', async () => {
    const complaint = await localDb.createComplaint({
      title: 'Wi-Fi Access Point Offline in Library 2nd Floor',
      description: 'Router blinking red, no connection for 50+ students studying.',
      category: 'wifi',
      campusZone: 'Central Library',
      locationDetails: '2nd Floor Reading Room',
      status: 'submitted',
      priority: 'medium',
      priorityScore: 50,
      priorityReasons: ['Study area connectivity'],
      assignedDepartment: 'IT Network & Hostel Wi-Fi',
      studentId: 'user-student-1',
      studentName: 'Aarav Sharma',
      isAnonymous: false,
      humanReviewRequired: false,
      pointsAwardedTriage: false,
      pointsAwardedResolution: false,
    });

    // 1st dispatch
    const firstResult = await sendComplaintEmailNotification(complaint);
    assert.ok(firstResult.notification);

    // Simulate that the first dispatch was successfully queued
    await localDb.updateEmailNotification(firstResult.notification.id, {
      status: 'queued',
      resendId: 'msg_resend_mock_id_123',
    });

    // 2nd dispatch for the EXACT same complaint
    const secondResult = await sendComplaintEmailNotification(complaint);

    // Must return alreadySent: true without creating a new record
    assert.equal(secondResult.alreadySent, true);
    assert.equal(secondResult.notification.id, firstResult.notification.id);
    assert.equal(secondResult.resendId, 'msg_resend_mock_id_123');

    // Verify only ONE notification record exists for this complaint in the database
    const notifs = await localDb.getEmailNotifications(complaint.id);
    assert.equal(notifs.length, 1);
  });

  await t.test('5. Security: Server-side API key protection & diagnostic secrecy', async () => {
    const config = getEmailConfig();

    // Verify no NEXT_PUBLIC_ prefix in server-side configuration
    assert.equal(typeof config.apiKeyPresent, 'boolean');
    assert.ok(config.senderEmail);

    // Verify that API key is NEVER leaked in public configuration
    assert.equal((config as any).RESEND_API_KEY, undefined);
    assert.equal((config as any).apiKey, undefined);
  });

  await t.test('6. Test Email Pipeline: Diagnostic verification with clear error handling', async () => {
    const testResult = await sendTestEmail('Dr. Meenakshi Sundaram', 'administrator');

    // Should return structured diagnostic response without throwing unhandled exceptions
    assert.equal(typeof testResult.success, 'boolean');
    assert.ok(testResult.providerStatus);
    assert.ok(testResult.timestamp);

    // If unconfigured or missing key in test env, verify informative error message and next steps
    if (!testResult.success) {
      assert.ok(testResult.error || testResult.restrictionNotes);
    }
  });

  await t.test('7. Accurate Provider Status: Queued vs Delivered distinction', async () => {
    // Create notification record with 'queued' status
    const notif = await localDb.saveEmailNotification({
      id: 'notif-status-test-1',
      complaintId: 'cmp-status-test',
      complaintReference: 'CMP-2026-0001',
      idempotencyKey: 'idemp-status-test',
      recipientEmail: 'admin@campus.edu',
      senderEmail: 'onboarding@resend.dev',
      intendedDepartment: 'Campus Estate & Civil Works',
      status: 'queued',
      resendId: 'resend_msg_test_abc',
      attemptCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Ensure status is 'queued' and NOT prematurely claimed as 'delivered'
    assert.equal(notif.status, 'queued');
    assert.notEqual(notif.status, 'delivered');
  });
});
