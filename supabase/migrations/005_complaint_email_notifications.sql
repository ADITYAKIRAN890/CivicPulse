-- ==============================================================================
-- 005_complaint_email_notifications.sql
-- CivicsPulse: Resend Email Notification Tracking & Idempotency Audit Trail
-- ==============================================================================

-- 1. Complaint Email Notifications Table
CREATE TABLE IF NOT EXISTS complaint_email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    complaint_reference TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    recipient_email TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    intended_department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed')),
    resend_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance & Idempotency Indexes
CREATE INDEX IF NOT EXISTS idx_complaint_email_complaint_id ON complaint_email_notifications(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_email_status ON complaint_email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_complaint_email_idempotency ON complaint_email_notifications(idempotency_key);

-- 3. Row-Level Security
ALTER TABLE complaint_email_notifications ENABLE ROW LEVEL SECURITY;

-- Select Policy: Authorized department staff can see notifications for their department; Administrators can see all
CREATE POLICY "Strict complaint email notifications select policy"
ON complaint_email_notifications FOR SELECT TO authenticated
USING (
    intended_department = get_current_user_department()
    OR get_current_user_role() = 'administrator'
);

-- Insert Policy: Authenticated campus services or authorized actors
CREATE POLICY "Strict complaint email notifications insert policy"
ON complaint_email_notifications FOR INSERT TO authenticated
WITH CHECK (
    get_current_user_role() IN ('administrator', 'department_staff')
    OR auth.uid() IS NOT NULL
);

-- Update Policy: Staff and Administrators can update status and retry state
CREATE POLICY "Strict complaint email notifications update policy"
ON complaint_email_notifications FOR UPDATE TO authenticated
USING (
    get_current_user_role() IN ('administrator', 'department_staff')
);
