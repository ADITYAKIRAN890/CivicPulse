import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { sendTestEmail, getEmailConfig } from '@/lib/email/resend-service';

/**
 * GET /api/email/test
 * Returns non-sensitive email service configuration diagnostics.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const config = getEmailConfig();
    return NextResponse.json({
      success: true,
      config: {
        isConfigured: config.isConfigured,
        apiKeyPresent: config.apiKeyPresent,
        notificationEmail: config.notificationEmail,
        senderEmail: config.senderEmail,
        appUrl: config.appUrl,
        sandboxModeNotice: config.sandboxModeNotice,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve email config';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/email/test
 * Protected development-only action to send a sample test email to COMPLAINT_NOTIFICATION_EMAIL.
 * Restricted strictly to campus administrators and department staff.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You must sign in to dispatch a test email notification.',
        },
        { status: 401 }
      );
    }

    if (user.role !== 'administrator' && user.role !== 'department_staff') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only Campus Administrators and Department Staff can execute email pipeline tests.',
        },
        { status: 403 }
      );
    }

    // Optional custom note or subject prefix from authorized tester
    const result = await sendTestEmail(user.fullName, user.role);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          providerStatus: result.providerStatus,
          recipient: result.recipient,
          sender: result.sender,
          restrictionNotes: result.restrictionNotes,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully accepted by Resend delivery pipeline (Message ID: ${result.messageId}).`,
      messageId: result.messageId,
      recipient: result.recipient,
      sender: result.sender,
      providerStatus: result.providerStatus,
      timestamp: result.timestamp,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send test email';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
