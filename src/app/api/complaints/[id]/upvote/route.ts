import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;

    const updated = await localDb.upvoteComplaint(id, user.id);
    return NextResponse.json({ success: true, complaint: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upvote complaint';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
