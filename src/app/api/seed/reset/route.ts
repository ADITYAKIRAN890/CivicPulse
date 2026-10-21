import { NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';

export async function POST() {
  try {
    localDb.resetToSeed();
    return NextResponse.json({
      success: true,
      message: 'Database reset to clean synthetic demo state with 6 role personas, appointments, complaints, rewards, and coupons.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset database';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
