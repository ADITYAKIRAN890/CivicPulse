import test from 'node:test';
import assert from 'node:assert/strict';
import { localDb } from '../src/lib/db/local-store';

test('Rewards Suite: Idempotency, Overspending, and Atomic Single-Use Coupon Redemption', async (t) => {
  localDb.resetToSeed();

  await t.test('Prevents overspending when purchasing a canteen voucher', async () => {
    // user-student-2 starts with 50 points
    const wallet = await localDb.getWallet('user-student-2');
    assert.equal(wallet.balance, 50);

    // Try to purchase cat-004 (Stationery voucher costs 100 points)
    await assert.rejects(
      async () => {
        await localDb.issueCanteenCoupon('user-student-2', 'cat-004');
      },
      (err: Error) => {
        return err.message.includes('Insufficient Civic Pulse Points');
      }
    );
  });

  await t.test('Atomically debits wallet and generates single-use coupon code', async () => {
    // Purchase cat-001 (Chai & Samosa costs 25 points)
    const initialWallet = await localDb.getWallet('user-student-2');
    const coupon = await localDb.issueCanteenCoupon('user-student-2', 'cat-001');

    assert.ok(coupon.couponCode.startsWith('CP-CPN-'));
    assert.equal(coupon.status, 'active');
    assert.equal(coupon.pointsSpent, 25);

    const updatedWallet = await localDb.getWallet('user-student-2');
    assert.equal(updatedWallet.balance, initialWallet.balance - 25);

    // Check reward ledger entry
    const ledger = await localDb.getRewardLedger('user-student-2');
    const debitEntry = ledger.find((e) => e.referenceId === coupon.id);
    assert.ok(debitEntry);
    assert.equal(debitEntry.amount, -25);
  });

  await t.test('Canteen operator can redeem an active coupon once', async () => {
    // Generate fresh coupon for user-student-1
    const coupon = await localDb.issueCanteenCoupon('user-student-1', 'cat-001');

    // Operator redeems coupon
    const redeemed = await localDb.redeemCanteenCoupon(coupon.couponCode, 'user-canteen-1');
    assert.equal(redeemed.status, 'redeemed');
    assert.ok(redeemed.redemptionReceiptCode);
    assert.equal(redeemed.redeemedByOperatorId, 'user-canteen-1');
  });

  await t.test('STRICT SINGLE-USE: Prevents duplicate redemption of the exact same coupon', async () => {
    // user-student-1 has pre-seeded coupon cpn-001 which is already redeemed
    await assert.rejects(
      async () => {
        await localDb.redeemCanteenCoupon('CP-CPN-7731-M2', 'user-canteen-1');
      },
      (err: Error) => {
        return err.message.includes('ALREADY been redeemed');
      }
    );
  });

  await t.test('Prevents non-operator users from redeeming coupons', async () => {
    // Student tries to redeem coupon at POS
    await assert.rejects(
      async () => {
        await localDb.redeemCanteenCoupon('CP-CPN-9944-X8', 'user-student-1');
      },
      (err: Error) => {
        return err.message.includes('Unauthorized: Only an approved Canteen Operator');
      }
    );
  });

  await t.test('Duplicate reward prevention: Cannot award triage points multiple times for the same ticket', async () => {
    // Complaint cmp-004 has pointsAwardedTriage = false
    const beforeTriageWallet = await localDb.getWallet('user-student-2');

    // First triage update -> awards +25 points
    const res1 = await localDb.updateComplaintStatus({
      complaintId: 'cmp-004',
      actorId: 'user-dept-staff-1',
      newStatus: 'triaged',
      notes: 'Work order assigned to lab repair specialist.',
    });
    assert.equal(res1.pointsAwarded, 25);

    const walletAfterFirst = await localDb.getWallet('user-student-2');
    assert.equal(walletAfterFirst.balance, beforeTriageWallet.balance + 25);

    // If an update or triage is triggered again, points must NOT be duplicated!
    const res2 = await localDb.updateComplaintStatus({
      complaintId: 'cmp-004',
      actorId: 'user-dept-staff-1',
      newStatus: 'in_progress',
      notes: 'Replacement rotor arriving tomorrow.',
    });
    assert.equal(res2.pointsAwarded, 0); // zero additional points!

    const finalWallet = await localDb.getWallet('user-student-2');
    assert.equal(finalWallet.balance, walletAfterFirst.balance);
  });
});
