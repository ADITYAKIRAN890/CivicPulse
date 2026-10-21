import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();

    const [wallet, ledger, catalog, coupons] = await Promise.all([
      localDb.getWallet(user.id),
      localDb.getRewardLedger(user.id),
      localDb.getCanteenCatalog(),
      localDb.getCoupons(user.role === 'student' ? user.id : undefined),
    ]);

    return NextResponse.json({
      success: true,
      wallet,
      ledger,
      catalog,
      coupons,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch rewards data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Purchase / Issue a Canteen Voucher from Civic Points
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { catalogItemId } = body;

    if (!catalogItemId) {
      return NextResponse.json({ success: false, error: 'Catalog item ID is required' }, { status: 400 });
    }

    const coupon = await localDb.issueCanteenCoupon(user.id, catalogItemId);
    const updatedWallet = await localDb.getWallet(user.id);

    return NextResponse.json({
      success: true,
      coupon,
      wallet: updatedWallet,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Coupon issuance failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
