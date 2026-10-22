import test from 'node:test';
import assert from 'node:assert/strict';
import { localDb } from '../src/lib/db/local-store';
import {
  ROLE_DASHBOARD_ROUTES,
  getDashboardRouteForRole,
  enforceRole,
  canAccessGrievance,
  canRedeemCoupons,
  canManageAppointments,
} from '../src/lib/auth/session';
import { UserRole } from '../src/types';

test('Multi-Role Authentication & Data Isolation Suite', async (t) => {
  localDb.resetToSeed();

  await t.test('1. Role-Based Redirects map each persona strictly to their authorized dashboard', () => {
    assert.equal(getDashboardRouteForRole('student'), '/');
    assert.equal(getDashboardRouteForRole('doctor'), '/doctor/dashboard');
    assert.equal(getDashboardRouteForRole('department_staff'), '/department-portal');
    assert.equal(getDashboardRouteForRole('grievance_officer'), '/grievance-portal');
    assert.equal(getDashboardRouteForRole('administrator'), '/admin');
    assert.equal(getDashboardRouteForRole('canteen_operator'), '/canteen-pos');
  });

  await t.test('2. Persona Database Verification: Authoritative roles retrieved directly from DB', async () => {
    const users = await localDb.getUsers();

    const student = users.find((u) => u.email === 'aarav.sharma@campus.edu');
    assert.ok(student);
    assert.equal(student.role, 'student');
    assert.equal(getDashboardRouteForRole(student.role), '/');

    const doctor = users.find((u) => u.email === 'dr.patel@campus.edu');
    assert.ok(doctor);
    assert.equal(doctor.role, 'doctor');
    assert.equal(getDashboardRouteForRole(doctor.role), '/doctor/dashboard');

    const staff = users.find((u) => u.email === 'rajesh.kumar@campus.edu');
    assert.ok(staff);
    assert.equal(staff.role, 'department_staff');
    assert.equal(getDashboardRouteForRole(staff.role), '/department-portal');

    const officer = users.find((u) => u.email === 'grievance.officer@campus.edu');
    assert.ok(officer);
    assert.equal(officer.role, 'grievance_officer');
    assert.equal(getDashboardRouteForRole(officer.role), '/grievance-portal');

    const admin = users.find((u) => u.email === 'admin.dean@campus.edu');
    assert.ok(admin);
    assert.equal(admin.role, 'administrator');
    assert.equal(getDashboardRouteForRole(admin.role), '/admin');

    const canteen = users.find((u) => u.email === 'canteen.pos@campus.edu');
    assert.ok(canteen);
    assert.equal(canteen.role, 'canteen_operator');
    assert.equal(getDashboardRouteForRole(canteen.role), '/canteen-pos');
  });

  await t.test('3. Anti-Tampering: Client cannot forge or self-promote role in database', async () => {
    const student = await localDb.getUserById('user-student-1');
    assert.ok(student);

    // Attempting to enforce administrative role on a student throws an authorization error
    assert.throws(
      () => enforceRole(student, ['administrator']),
      /Forbidden: Role "student" does not have permission/
    );

    // Attempting to enforce doctor role on a student throws an authorization error
    assert.throws(
      () => enforceRole(student, ['doctor']),
      /Forbidden: Role "student" does not have permission/
    );
  });

  await t.test('4. Student Data Isolation: Students cannot view other students wallets or grievances', async () => {
    const student1 = await localDb.getUserById('user-student-1');
    const student2 = await localDb.getUserById('user-student-2');
    assert.ok(student1 && student2);

    // Wallet Isolation
    const wallet1 = await localDb.getWallet(student1.id);
    const wallet2 = await localDb.getWallet(student2.id);
    assert.ok(wallet1 && wallet2);
    assert.notEqual(wallet1.userId, wallet2.userId);

    // Grievance Isolation: Student 1 only sees grievances submitted by Student 1
    const student1Grievances = await localDb.getGrievances(student1);
    for (const g of student1Grievances) {
      assert.equal(g.studentId, student1.id);
    }

    // Permission helper blocks student1 from student2's confidential file
    assert.equal(canAccessGrievance(student1, student2.id), false);
    assert.equal(canAccessGrievance(student1, student1.id), true);
  });

  await t.test('5. Doctor Clinical Isolation: Doctors cannot access or manage another doctors appointments', async () => {
    const doc1User = await localDb.getUserById('user-doctor-1');
    const doc2User = await localDb.getUserById('user-doctor-2');
    assert.ok(doc1User && doc2User);

    const doc1 = (await localDb.getDoctors()).find((d) => d.userId === doc1User.id);
    const doc2 = (await localDb.getDoctors()).find((d) => d.userId === doc2User.id);
    assert.ok(doc1 && doc2);

    // Permission helper test
    assert.equal(canManageAppointments(doc1User, doc1User.id), true);
    assert.equal(canManageAppointments(doc1User, doc2User.id), false);

    // Book an appointment for Doctor 1
    const apt = await localDb.bookDoctorAppointment({
      studentId: 'user-student-1',
      doctorId: doc1.id,
      date: '2026-11-20',
      timeSlot: '11:00 AM',
      reasonCategory: 'Fever & Flu Clinic',
    });

    // Doctor 2 attempting to update Doctor 1's appointment must be rejected!
    await assert.rejects(
      async () => {
        await localDb.updateAppointmentStatus(apt.id, doc2User.id, 'in_consultation');
      },
      /Only the assigned doctor or an administrator can update consultation status/
    );

    // Assigned Doctor 1 CAN update the appointment
    const updated = await localDb.updateAppointmentStatus(apt.id, doc1User.id, 'in_consultation');
    assert.equal(updated.status, 'in_consultation');
  });

  await t.test('6. Grievance Confidentiality: Doctors and Staff are strictly barred from grievance records', async () => {
    const doctorUser = await localDb.getUserById('user-doctor-1');
    const staffUser = await localDb.getUserById('user-dept-staff-1');
    const canteenUser = await localDb.getUserById('user-canteen-1');
    const officerUser = await localDb.getUserById('user-grievance-1');
    assert.ok(doctorUser && staffUser && canteenUser && officerUser);

    // Doctors get zero grievances
    const docGrievances = await localDb.getGrievances(doctorUser);
    assert.equal(docGrievances.length, 0);
    assert.equal(canAccessGrievance(doctorUser), false);

    // Facilities staff get zero grievances
    const staffGrievances = await localDb.getGrievances(staffUser);
    assert.equal(staffGrievances.length, 0);
    assert.equal(canAccessGrievance(staffUser), false);

    // Canteen operators get zero grievances
    const canteenGrievances = await localDb.getGrievances(canteenUser);
    assert.equal(canteenGrievances.length, 0);
    assert.equal(canAccessGrievance(canteenUser), false);

    // Grievance Officer has full access to confidential files
    const officerGrievances = await localDb.getGrievances(officerUser);
    assert.ok(officerGrievances.length > 0);
    assert.equal(canAccessGrievance(officerUser), true);
  });

  await t.test('7. Canteen POS Authorization: Non-operators cannot redeem student coupons', async () => {
    const student = await localDb.getUserById('user-student-1');
    const doctor = await localDb.getUserById('user-doctor-1');
    const staff = await localDb.getUserById('user-dept-staff-1');
    const canteen = await localDb.getUserById('user-canteen-1');
    assert.ok(student && doctor && staff && canteen);

    assert.equal(canRedeemCoupons(student), false);
    assert.equal(canRedeemCoupons(doctor), false);
    assert.equal(canRedeemCoupons(staff), false);
    assert.equal(canRedeemCoupons(canteen), true);

    // Issue a coupon
    const coupon = await localDb.issueCanteenCoupon(student.id, 'cat-001');
    assert.ok(coupon.couponCode);

    // Attempting redemption by student must fail
    await assert.rejects(
      async () => {
        await localDb.redeemCanteenCoupon(coupon.couponCode, student.id);
      },
      /Unauthorized: Only an approved Canteen Operator or Admin can redeem coupons/
    );

    // Attempting redemption by doctor must fail
    await assert.rejects(
      async () => {
        await localDb.redeemCanteenCoupon(coupon.couponCode, doctor.id);
      },
      /Unauthorized: Only an approved Canteen Operator or Admin can redeem coupons/
    );

    // Authorized Canteen Operator can successfully redeem
    const redeemed = await localDb.redeemCanteenCoupon(coupon.couponCode, canteen.id);
    assert.equal(redeemed.status, 'redeemed');
  });

  await t.test('8. People Directory Security: Non-administrators cannot delete users', async () => {
    const student = await localDb.getUserById('user-student-1');
    assert.ok(student);

    // Only administrator has permission to delete users
    assert.throws(
      () => enforceRole(student, ['administrator']),
      /Forbidden: Role "student" does not have permission/
    );
  });
});
