import { Resend } from 'resend';
import { Complaint, ComplaintEmailNotification, EmailNotificationStatus } from '@/types';
import { localDb } from '@/lib/db/local-store';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase-client';

// Lazy client initialization to avoid instantiation when key is unset
let resendClientInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('placeholder') || apiKey === 're_your_resend_api_key_here') {
    return null;
  }
  if (!resendClientInstance) {
    resendClientInstance = new Resend(apiKey.trim());
  }
  return resendClientInstance;
}

export interface EmailServiceConfig {
  isConfigured: boolean;
  apiKeyPresent: boolean;
  notificationEmail: string;
  senderEmail: string;
  appUrl: string;
  sandboxModeNotice: string;
}

/**
 * Returns the current server-side email configuration state without exposing secrets.
 */
export function getEmailConfig(): EmailServiceConfig {
  const apiKey = process.env.RESEND_API_KEY || '';
  const apiKeyPresent = Boolean(apiKey && apiKey.startsWith('re_') && !apiKey.includes('placeholder'));
  const notificationEmail = (process.env.COMPLAINT_NOTIFICATION_EMAIL || '').trim();
  const senderEmail = (process.env.EMAIL_FROM || 'CivicsPulse Campus <onboarding@resend.dev>').trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();

  return {
    isConfigured: Boolean(apiKeyPresent && notificationEmail),
    apiKeyPresent,
    notificationEmail,
    senderEmail,
    appUrl,
    sandboxModeNotice:
      'Resend Testing Sandbox: With sender onboarding@resend.dev, emails can ONLY be delivered to your registered/verified Resend account email. Verify a custom domain in Resend to send to arbitrary department inboxes.',
  };
}

/**
 * Escape HTML to prevent injection inside email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sync email notification to Supabase if live Supabase is configured.
 */
async function syncToSupabaseIfAvailable(notification: ComplaintEmailNotification): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('complaint_email_notifications').upsert({
        id: notification.id,
        complaint_id: notification.complaintId,
        complaint_reference: notification.complaintReference,
        idempotency_key: notification.idempotencyKey,
        recipient_email: notification.recipientEmail,
        sender_email: notification.senderEmail,
        intended_department: notification.intendedDepartment,
        status: notification.status,
        resend_id: notification.resendId,
        attempt_count: notification.attemptCount,
        error_message: notification.errorMessage,
        created_at: notification.createdAt,
        updated_at: notification.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase email notification sync fallback:', err);
    }
  }
}

export interface SendComplaintEmailResult {
  success: boolean;
  alreadySent?: boolean;
  status: EmailNotificationStatus;
  resendId?: string;
  recipient: string;
  sender: string;
  error?: string;
  restrictionNotes?: string;
  notification: ComplaintEmailNotification;
}

/**
 * Generates the clean Neo-Brutalist HTML template for real complaint notifications.
 */
function generateComplaintEmailHtml(complaint: Complaint, appUrl: string): string {
  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: '#FB7185', text: '#000000', border: '#000000' },
    high: { bg: '#FB923C', text: '#000000', border: '#000000' },
    medium: { bg: '#FFE600', text: '#000000', border: '#000000' },
    low: { bg: '#A3E635', text: '#000000', border: '#000000' },
  };

  const prio = priorityColors[complaint.priority] || priorityColors.medium;
  const dashboardLink = `${appUrl}/department-portal`;
  const sanitizedTitle = escapeHtml(complaint.title);
  const sanitizedDesc = escapeHtml(complaint.description);
  const sanitizedRef = escapeHtml(complaint.referenceCode);
  const sanitizedDept = escapeHtml(complaint.assignedDepartment);
  const sanitizedZone = escapeHtml(complaint.campusZone);
  const sanitizedLoc = escapeHtml(complaint.locationDetails);
  const formattedDate = new Date(complaint.createdAt).toUTCString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CivicsPulse Campus Alert - ${sanitizedRef}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7EE; color: #000000;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 3.5px solid #000000; box-shadow: 6px 6px 0px #000000; border-radius: 16px; overflow: hidden;">
    
    <!-- Header Banner -->
    <div style="background-color: #FFE600; padding: 20px; border-bottom: 3px solid #000000; text-align: left;">
      <div style="display: inline-block; background-color: #000000; color: #FFFFFF; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        CivicsPulse Smart Campus Alert
      </div>
      <h1 style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: #000000; letter-spacing: -0.02em;">
        New Civic Incident Filed
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #1f2937;">
        Department Dispatch Notification
      </p>
    </div>

    <!-- Main Content Body -->
    <div style="padding: 24px;">
      
      <!-- Metadata Badge Card -->
      <div style="background-color: #FAF7EE; border: 2.5px solid #000000; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; font-weight: 800; color: #4b5563; width: 140px;">Complaint Ref:</td>
            <td style="padding: 6px 0; font-weight: 900; font-family: monospace; font-size: 14px; color: #000000;">${sanitizedRef}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 800; color: #4b5563;">Intended Dept:</td>
            <td style="padding: 6px 0; font-weight: 900; color: #000000;">${sanitizedDept}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 800; color: #4b5563;">Category / Zone:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #000000;">${escapeHtml(complaint.category)} &bull; ${sanitizedZone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 800; color: #4b5563;">Exact Location:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #000000;">${sanitizedLoc}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 800; color: #4b5563;">Priority Level:</td>
            <td style="padding: 6px 0;">
              <span style="display: inline-block; background-color: ${prio.bg}; color: ${prio.text}; border: 1.5px solid #000000; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 900; text-transform: uppercase;">
                ${escapeHtml(complaint.priority)} (${complaint.priorityScore}/100)
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 800; color: #4b5563;">Submission Time:</td>
            <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #374151;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <!-- Complaint Details Block -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 900; color: #000000;">
          Incident Title: ${sanitizedTitle}
        </h3>
        <div style="background-color: #FFFFFF; border: 2px solid #000000; border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.5; color: #111827;">
          ${sanitizedDesc}
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${dashboardLink}" style="display: inline-block; background-color: #FFE600; color: #000000; text-decoration: none; font-weight: 900; font-size: 14px; padding: 12px 28px; border: 2.5px solid #000000; border-radius: 10px; box-shadow: 3px 3px 0px #000000;">
          Open Department Portal &amp; Triage Incident &rarr;
        </a>
      </div>

      <!-- Security Notice -->
      <p style="margin-top: 24px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1.5px dashed #d1d5db; padding-top: 16px;">
        Sent automatically by the CivicsPulse Smart Campus Notification Dispatcher via Resend.<br>
        Intended exclusively for authorized campus operational response personnel.
      </p>

    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates the clean plain text fallback for complaint notifications.
 */
function generateComplaintEmailText(complaint: Complaint, appUrl: string): string {
  return `
[CIVICSPULSE CAMPUS ALERT]
New Civic Incident Filed - Department Dispatch

Complaint Reference: ${complaint.referenceCode}
Intended Department: ${complaint.assignedDepartment}
Category: ${complaint.category}
Location: ${complaint.campusZone} (${complaint.locationDetails})
Priority: ${complaint.priority.toUpperCase()} (${complaint.priorityScore}/100)
Submitted: ${new Date(complaint.createdAt).toUTCString()}

Title: ${complaint.title}
Description:
${complaint.description}

Action Required:
Open Department Portal to triage and resolve this ticket:
${appUrl}/department-portal
`;
}

/**
 * Dispatches an automated email notification for a newly submitted complaint.
 * Enforces strict persistent idempotency to prevent duplicate emails on retries.
 */
export async function sendComplaintEmailNotification(complaint: Complaint): Promise<SendComplaintEmailResult> {
  const config = getEmailConfig();
  const idempotencyKey = `complaint_email_${complaint.id}`;
  const now = new Date().toISOString();

  // 1. Check persistent idempotency key
  const existing = await localDb.getEmailNotificationByIdempotencyKey(idempotencyKey);
  if (existing) {
    if (existing.status === 'queued' || existing.status === 'sent' || existing.status === 'delivered') {
      return {
        success: true,
        alreadySent: true,
        status: existing.status,
        resendId: existing.resendId,
        recipient: existing.recipientEmail,
        sender: existing.senderEmail,
        notification: existing,
      };
    }
  }

  // 2. Prepare or update notification record
  let notificationRecord: ComplaintEmailNotification = existing
    ? {
        ...existing,
        attemptCount: existing.attemptCount + 1,
        updatedAt: now,
      }
    : {
        id: `notif-email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        complaintId: complaint.id,
        complaintReference: complaint.referenceCode,
        idempotencyKey,
        recipientEmail: config.notificationEmail || 'unconfigured@campus.edu',
        senderEmail: config.senderEmail,
        intendedDepartment: complaint.assignedDepartment,
        status: 'pending',
        attemptCount: 1,
        createdAt: now,
        updatedAt: now,
      };

  await localDb.saveEmailNotification(notificationRecord);

  // 3. Validate server environment configuration
  if (!config.apiKeyPresent) {
    notificationRecord.status = 'failed';
    notificationRecord.errorMessage =
      'RESEND_API_KEY is not configured in server environment variables (.env.local). Set your Resend API key to enable email delivery.';
    await localDb.saveEmailNotification(notificationRecord);
    await syncToSupabaseIfAvailable(notificationRecord);

    return {
      success: false,
      status: 'failed',
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      error: notificationRecord.errorMessage,
      restrictionNotes: 'Add RESEND_API_KEY=re_... in .env.local to enable live dispatch.',
      notification: notificationRecord,
    };
  }

  if (!config.notificationEmail) {
    notificationRecord.status = 'failed';
    notificationRecord.errorMessage =
      'COMPLAINT_NOTIFICATION_EMAIL is not configured in server environment variables. Set your verified Resend email address to receive complaint notifications.';
    await localDb.saveEmailNotification(notificationRecord);
    await syncToSupabaseIfAvailable(notificationRecord);

    return {
      success: false,
      status: 'failed',
      recipient: '',
      sender: config.senderEmail,
      error: notificationRecord.errorMessage,
      restrictionNotes: 'Add COMPLAINT_NOTIFICATION_EMAIL=your-verified-email@gmail.com in .env.local.',
      notification: notificationRecord,
    };
  }

  // 4. Send via Resend SDK
  const client = getResendClient();
  if (!client) {
    notificationRecord.status = 'failed';
    notificationRecord.errorMessage = 'Failed to initialize Resend client instance.';
    await localDb.saveEmailNotification(notificationRecord);
    return {
      success: false,
      status: 'failed',
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      error: notificationRecord.errorMessage,
      notification: notificationRecord,
    };
  }

  try {
    const subject = `[CivicsPulse Alert] ${complaint.priority.toUpperCase()}: ${complaint.referenceCode} - ${complaint.title.substring(0, 50)}`;
    const html = generateComplaintEmailHtml(complaint, config.appUrl);
    const text = generateComplaintEmailText(complaint, config.appUrl);

    const { data, error } = await client.emails.send({
      from: config.senderEmail,
      to: [config.notificationEmail],
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': complaint.id,
        'X-CivicsPulse-Ref': complaint.referenceCode,
      },
    });

    if (error) {
      const errMsg = error.message || String(error);
      notificationRecord.status = 'failed';
      notificationRecord.errorMessage = errMsg;
      await localDb.saveEmailNotification(notificationRecord);
      await syncToSupabaseIfAvailable(notificationRecord);

      let restrictionNotes: string | undefined;
      if (errMsg.toLowerCase().includes('own email address') || errMsg.toLowerCase().includes('testing')) {
        restrictionNotes =
          'Resend Sandbox Restriction: onboarding@resend.dev can only send to your verified Resend account email. Verify that COMPLAINT_NOTIFICATION_EMAIL matches your exact Resend account Gmail.';
      } else if (errMsg.toLowerCase().includes('domain')) {
        restrictionNotes =
          'Domain Verification Required: The custom sender domain must be verified in the Resend dashboard with DKIM/SPF records.';
      }

      return {
        success: false,
        status: 'failed',
        recipient: config.notificationEmail,
        sender: config.senderEmail,
        error: errMsg,
        restrictionNotes,
        notification: notificationRecord,
      };
    }

    if (data && data.id) {
      // API request accepted and queued by Resend delivery pipeline
      notificationRecord.status = 'queued';
      notificationRecord.resendId = data.id;
      notificationRecord.errorMessage = undefined;
      await localDb.saveEmailNotification(notificationRecord);
      await syncToSupabaseIfAvailable(notificationRecord);

      return {
        success: true,
        status: 'queued',
        resendId: data.id,
        recipient: config.notificationEmail,
        sender: config.senderEmail,
        notification: notificationRecord,
      };
    }

    notificationRecord.status = 'failed';
    notificationRecord.errorMessage = 'Resend API returned an unexpected empty response payload.';
    await localDb.saveEmailNotification(notificationRecord);
    return {
      success: false,
      status: 'failed',
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      error: notificationRecord.errorMessage,
      notification: notificationRecord,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network failure while calling Resend API';
    notificationRecord.status = 'failed';
    notificationRecord.errorMessage = errorMsg;
    await localDb.saveEmailNotification(notificationRecord);
    await syncToSupabaseIfAvailable(notificationRecord);

    return {
      success: false,
      status: 'failed',
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      error: errorMsg,
      notification: notificationRecord,
    };
  }
}

export interface SendTestEmailResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  sender: string;
  providerStatus: string;
  timestamp: string;
  error?: string;
  restrictionNotes?: string;
}

/**
 * Dispatches a securely labelled development-only test email to verify credentials and sender-recipient compatibility.
 */
export async function sendTestEmail(actorName?: string, actorRole?: string): Promise<SendTestEmailResult> {
  const config = getEmailConfig();
  const timestamp = new Date().toISOString();

  if (!config.apiKeyPresent) {
    return {
      success: false,
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      providerStatus: 'unconfigured_missing_key',
      timestamp,
      error: 'RESEND_API_KEY is missing or contains placeholder in .env.local.',
      restrictionNotes: 'Please create .env.local with your real RESEND_API_KEY=re_... from resend.com.',
    };
  }

  if (!config.notificationEmail) {
    return {
      success: false,
      recipient: '',
      sender: config.senderEmail,
      providerStatus: 'unconfigured_missing_recipient',
      timestamp,
      error: 'COMPLAINT_NOTIFICATION_EMAIL is missing in .env.local.',
      restrictionNotes: 'Set COMPLAINT_NOTIFICATION_EMAIL to your verified Resend account Gmail.',
    };
  }

  const client = getResendClient();
  if (!client) {
    return {
      success: false,
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      providerStatus: 'initialization_failed',
      timestamp,
      error: 'Failed to initialize Resend client.',
    };
  }

  const subject = `[TEST MODE - CivicsPulse] Resend Email Pipeline Test (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CivicsPulse Test Email</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7EE; color: #000000;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 3.5px solid #000000; box-shadow: 6px 6px 0px #000000; border-radius: 16px; overflow: hidden;">
    
    <div style="background-color: #38BDF8; padding: 18px; border-bottom: 3px solid #000000; text-align: left;">
      <div style="display: inline-block; background-color: #000000; color: #FFFFFF; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
        Development Test Mode
      </div>
      <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 900; color: #000000;">
        Resend Pipeline Verification Successful!
      </h1>
    </div>

    <div style="padding: 24px; font-size: 13px; line-height: 1.6;">
      <p style="margin-top: 0; font-weight: 700; color: #111827;">
        This test notification confirms that your CivicsPulse Next.js server has successfully authenticated with the Resend API.
      </p>

      <div style="background-color: #FAF7EE; border: 2px solid #000000; border-radius: 10px; padding: 14px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #4b5563; width: 140px;">Sender Address:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #000000;">${escapeHtml(config.senderEmail)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #4b5563;">Configured Recipient:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #000000;">${escapeHtml(config.notificationEmail)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #4b5563;">Initiated By:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #000000;">${escapeHtml(actorName || 'Campus Administrator')} (${escapeHtml(actorRole || 'admin')})</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #4b5563;">Server Timestamp:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #374151;">${timestamp}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #A3E635; border: 2px solid #000000; border-radius: 10px; padding: 12px; font-weight: 800; font-size: 12px; margin-bottom: 16px;">
        &check; Status: API Request Accepted &amp; Queued for Inbound Delivery
      </div>

      <p style="font-size: 11px; color: #6b7280; margin-bottom: 0;">
        Note: When testing without a verified custom domain, Resend requires all emails to be addressed exclusively to your own verified account email address.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await client.emails.send({
      from: config.senderEmail,
      to: [config.notificationEmail],
      subject,
      html,
      text: `[TEST MODE - CivicsPulse] Resend Email Pipeline Test.\nSender: ${config.senderEmail}\nRecipient: ${config.notificationEmail}\nTimestamp: ${timestamp}\nStatus: Dispatched.`,
    });

    if (error) {
      const errMsg = error.message || String(error);
      let restrictionNotes: string | undefined;
      if (errMsg.toLowerCase().includes('own email address') || errMsg.toLowerCase().includes('testing')) {
        restrictionNotes =
          'Resend Sandbox Restriction: onboarding@resend.dev can only send to your verified Resend account email. Verify that COMPLAINT_NOTIFICATION_EMAIL matches your registered Resend account Gmail.';
      }
      return {
        success: false,
        recipient: config.notificationEmail,
        sender: config.senderEmail,
        providerStatus: 'provider_rejected',
        timestamp,
        error: errMsg,
        restrictionNotes,
      };
    }

    return {
      success: true,
      messageId: data?.id,
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      providerStatus: 'queued_accepted',
      timestamp,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network failure while calling Resend';
    return {
      success: false,
      recipient: config.notificationEmail,
      sender: config.senderEmail,
      providerStatus: 'network_failure',
      timestamp,
      error: errorMsg,
    };
  }
}
