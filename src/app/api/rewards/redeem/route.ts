import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser, enforceRole } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Only canteen operators or administrators can redeem coupons
    enforceRole(user, ['canteen_operator', 'administrator']);

    const body = await req.json();
    const { couponCode } = body;

    if (!couponCode) {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const redeemedCoupon = await localDb.redeemCanteenCoupon(couponCode, user.id);

    return NextResponse.json({
      success: true,
      coupon: redeemedCoupon,
      message: `Coupon ${redeemedCoupon.couponCode} for ${redeemedCoupon.title} successfully settled! Receipt: ${redeemedCoupon.redemptionReceiptCode}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Coupon redemption failed';
    const isConflict = message.toLowerCase().includes('already been redeemed');
    return NextResponse.json(
      { success: false, error: message },
      { status: isConflict ? 409 : 400 }
    );
  }
}
