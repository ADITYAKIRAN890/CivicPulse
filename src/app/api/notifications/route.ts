import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const notifications = await localDb.getNotifications(user.id);
    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await localDb.markAllNotificationsRead(user.id);
    } else if (notificationId) {
      await localDb.markNotificationRead(notificationId);
    }

    const notifications = await localDb.getNotifications(user.id);
    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update notifications';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
