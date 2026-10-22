import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser, enforceRole } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    enforceRole(currentUser, ['administrator']);

    const { id } = await context.params;
    await localDb.deleteUser(id);

    return NextResponse.json({
      success: true,
      message: 'Person removed from campus database successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete person';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
