import test from 'node:test';
import assert from 'node:assert/strict';
import { localDb } from '../src/lib/db/local-store';

test('People Database Suite: Adding People, Role Auto-Provisioning, and Deletion', async (t) => {
  localDb.resetToSeed();

  await t.test('Adds a student to the database and auto-provisions their civic wallet', async () => {
    const res = await localDb.addPerson({
      fullName: 'Vikramaditya Roy',
      email: 'vikram.roy@campus.edu',
      role: 'student',
      rollNumber: 'CS2026-901',
      department: 'Computer Science',
    });

    assert.ok(res.user.id);
    assert.equal(res.user.fullName, 'Vikramaditya Roy');
    assert.equal(res.user.role, 'student');
    assert.equal(res.user.isApproved, true);

    // Verify wallet auto-initialized with welcome points
    const wallet = await localDb.getWallet(res.user.id);
    assert.equal(wallet.balance, 25);
    assert.equal(wallet.lifetimeEarned, 25);

    // Verify presence in users list
    const found = await localDb.getUserById(res.user.id);
    assert.ok(found);
    assert.equal(found.email, 'vikram.roy@campus.edu');
  });

  await t.test('Adds a doctor and automatically registers them in the doctor appointment directory', async () => {
    const res = await localDb.addPerson({
      fullName: 'Dr. Anupam Mukherjee',
      email: 'dr.anupam@campus.edu',
      role: 'doctor',
      specialization: 'Cardiology & Campus Emergency Care',
      qualification: 'MBBS, MD (Cardio)',
      clinicCabin: 'Cabin 204, Campus Health Center',
      consultationHours: '10:00 AM - 02:00 PM',
    });

    assert.ok(res.user.id);
    assert.ok(res.doctor);
    assert.equal(res.doctor?.fullName, 'Dr. Anupam Mukherjee');
    assert.equal(res.doctor?.clinicCabin, 'Cabin 204, Campus Health Center');

    // Verify they are visible in doctors list
    const allDoctors = await localDb.getDoctors();
    const docFound = allDoctors.find((d) => d.fullName === 'Dr. Anupam Mukherjee');
    assert.ok(docFound);
    assert.equal(docFound.specialization, 'Cardiology & Campus Emergency Care');
  });

  await t.test('Prevents adding a person with an existing duplicate email', async () => {
    await assert.rejects(
      async () => {
        await localDb.addPerson({
          fullName: 'Duplicate Aarav',
          email: 'aarav.sharma@campus.edu', // pre-existing seed email
          role: 'student',
        });
      },
      (err: Error) => {
        return err.message.includes('already exists');
      }
    );
  });

  await t.test('Deletes a person from the database and cleans up related doctor records', async () => {
    // Add temporary person
    const res = await localDb.addPerson({
      fullName: 'Temp Test Person',
      email: 'temp.person@campus.edu',
      role: 'doctor',
      specialization: 'Temporary Specialty',
    });

    assert.ok(res.user.id);
    const beforeCount = (await localDb.getUsers()).length;

    // Delete person
    const deleted = await localDb.deleteUser(res.user.id);
    assert.equal(deleted, true);

    const afterCount = (await localDb.getUsers()).length;
    assert.equal(afterCount, beforeCount - 1);

    // Verify doctor record also removed
    const doctors = await localDb.getDoctors();
    assert.equal(doctors.some((d) => d.userId === res.user.id), false);
  });
});
