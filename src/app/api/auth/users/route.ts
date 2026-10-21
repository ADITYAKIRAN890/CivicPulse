import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser, enforceRole } from '@/lib/auth/session';

export async function GET() {
  try {
    const users = await localDb.getUsers();
    return NextResponse.json({ success: true, users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch users';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    enforceRole(currentUser, ['administrator']);

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const updated = await localDb.approveUser(userId);
    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to approve user';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
