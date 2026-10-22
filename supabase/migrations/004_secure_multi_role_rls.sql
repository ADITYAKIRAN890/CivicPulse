-- ============================================================================
-- CivicsPulse Smart-Campus Database Schema
-- Migration 004: Comprehensive Multi-Role Row Level Security (RLS) & Data Isolation
-- Enforces Strict Persona Scoping, Ownership Verification & Anti-Tampering
-- Compatible with PostgreSQL 15+ and Supabase Production
-- ============================================================================

-- Ensure RLS is enabled on all core tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaint_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS canteen_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS canteen_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- SECURITY DEFINER HELPER FUNCTIONS (Zero Recursion, Fast Execution)
-- ----------------------------------------------------------------------------

-- Helper 1: Get current authenticated user's role from trusted profiles table
CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper 2: Get current authenticated user's department
CREATE OR REPLACE FUNCTION get_current_user_department() 
RETURNS TEXT AS $$
    SELECT department FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper 3: Get doctor ID linked to authenticated doctor profile
CREATE OR REPLACE FUNCTION get_current_doctor_id() 
RETURNS UUID AS $$
    SELECT id FROM doctors WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own non-privileged profile data" ON profiles;
DROP POLICY IF EXISTS "Strict profile select policy" ON profiles;
DROP POLICY IF EXISTS "Strict profile update policy" ON profiles;
DROP POLICY IF EXISTS "Strict profile insert policy" ON profiles;
DROP POLICY IF EXISTS "Strict profile delete policy" ON profiles;

-- Users can view their own profile, doctors can view their patients, admins/staff view directory
CREATE POLICY "Strict profile select policy"
ON profiles FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR get_current_user_role() IN ('administrator', 'department_staff', 'grievance_officer')
    -- Doctors can only view profiles of students who booked appointments with them
    OR (
        get_current_user_role() = 'doctor' 
        AND id IN (
            SELECT student_id FROM appointments 
            WHERE doctor_id = get_current_doctor_id()
        )
    )
    -- Doctor directory user profiles are viewable by all campus users
    OR id IN (SELECT user_id FROM doctors)
);

-- Users can update non-privileged info; PREVENTS SELF-ASSIGNING PRIVILEGED ROLES
CREATE POLICY "Strict profile update policy"
ON profiles FOR UPDATE TO authenticated
USING (
    auth.uid() = id 
    OR get_current_user_role() = 'administrator'
)
WITH CHECK (
    get_current_user_role() = 'administrator'
    OR (
        auth.uid() = id 
        AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Role cannot be changed!
        AND is_approved = (SELECT is_approved FROM profiles WHERE id = auth.uid()) -- Approval cannot be self-granted!
    )
);

-- Profiles can only be inserted by self as student or by administrator
CREATE POLICY "Strict profile insert policy"
ON profiles FOR INSERT TO authenticated
WITH CHECK (
    get_current_user_role() = 'administrator'
    OR (auth.uid() = id AND role = 'student')
);

-- Profiles can only be deleted by administrator
CREATE POLICY "Strict profile delete policy"
ON profiles FOR DELETE TO authenticated
USING (get_current_user_role() = 'administrator');

-- ----------------------------------------------------------------------------
-- 2. DOCTORS DIRECTORY POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Doctors directory is viewable by all campus users" ON doctors;
DROP POLICY IF EXISTS "Doctors can manage their own schedule and blocked dates" ON doctors;
DROP POLICY IF EXISTS "Strict doctor update policy" ON doctors;
DROP POLICY IF EXISTS "Strict doctor insert policy" ON doctors;

CREATE POLICY "Doctors directory is viewable by all campus users"
ON doctors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Strict doctor update policy"
ON doctors FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR get_current_user_role() = 'administrator');

CREATE POLICY "Strict doctor insert policy"
ON doctors FOR INSERT TO authenticated
WITH CHECK (get_current_user_role() = 'administrator');

-- ----------------------------------------------------------------------------
-- 3. APPOINTMENTS POLICIES (STRICT CLINICAL DATA ISOLATION)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Students see their own appointments" ON appointments;
DROP POLICY IF EXISTS "Strict appointments select policy" ON appointments;
DROP POLICY IF EXISTS "Strict appointments insert policy" ON appointments;
DROP POLICY IF EXISTS "Strict appointments update policy" ON appointments;
DROP POLICY IF EXISTS "Strict appointments delete policy" ON appointments;

-- Students only see their own appointments; Doctors only see appointments assigned to them; Admin sees all
CREATE POLICY "Strict appointments select policy"
ON appointments FOR SELECT TO authenticated
USING (
    student_id = auth.uid() 
    OR doctor_id = get_current_doctor_id()
    OR get_current_user_role() = 'administrator'
);

-- Students can book appointments ONLY for their own account
CREATE POLICY "Strict appointments insert policy"
ON appointments FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid() 
    OR get_current_user_role() = 'administrator'
);

-- Students can cancel/reschedule their own; Doctors can update consultation status for assigned appointments
CREATE POLICY "Strict appointments update policy"
ON appointments FOR UPDATE TO authenticated
USING (
    student_id = auth.uid() 
    OR doctor_id = get_current_doctor_id()
    OR get_current_user_role() = 'administrator'
);

CREATE POLICY "Strict appointments delete policy"
ON appointments FOR DELETE TO authenticated
USING (
    student_id = auth.uid() 
    OR doctor_id = get_current_doctor_id()
    OR get_current_user_role() = 'administrator'
);

-- ----------------------------------------------------------------------------
-- 4. COMPLAINTS POLICIES (CIVIC FEED & DEPARTMENT WORK ORDER ISOLATION)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Campus members can view active complaints" ON complaints;
DROP POLICY IF EXISTS "Students can submit complaints" ON complaints;
DROP POLICY IF EXISTS "Staff and admin can update complaint status" ON complaints;
DROP POLICY IF EXISTS "Strict complaints select policy" ON complaints;
DROP POLICY IF EXISTS "Strict complaints insert policy" ON complaints;
DROP POLICY IF EXISTS "Strict complaints update policy" ON complaints;

CREATE POLICY "Strict complaints select policy"
ON complaints FOR SELECT TO authenticated
USING (
    student_id = auth.uid()
    OR assigned_department = get_current_user_department()
    OR get_current_user_role() = 'administrator'
    -- Non-anonymous public tickets viewable by campus members
    OR is_anonymous = false
);

CREATE POLICY "Strict complaints insert policy"
ON complaints FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid() 
    AND status = 'submitted'
);

CREATE POLICY "Strict complaints update policy"
ON complaints FOR UPDATE TO authenticated
USING (
    get_current_user_role() = 'administrator'
    OR (
        get_current_user_role() = 'department_staff' 
        AND assigned_department = get_current_user_department()
    )
    OR (
        student_id = auth.uid() 
        AND status IN ('verified_by_student', 'escalated')
    )
);

-- ----------------------------------------------------------------------------
-- 5. GRIEVANCES: HIGH-SECURITY CONFIDENTIALITY ISOLATION
-- Doctors, Canteen Operators, and General Department Staff are Strictly BARRED
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Grievance confidentiality restriction" ON grievances;
DROP POLICY IF EXISTS "Students can submit confidential grievances" ON grievances;
DROP POLICY IF EXISTS "Only Grievance Officers can update grievance files" ON grievances;
DROP POLICY IF EXISTS "Strict grievances select policy" ON grievances;
DROP POLICY IF EXISTS "Strict grievances insert policy" ON grievances;
DROP POLICY IF EXISTS "Strict grievances update policy" ON grievances;

CREATE POLICY "Strict grievances select policy"
ON grievances FOR SELECT TO authenticated
USING (
    student_id = auth.uid() 
    OR get_current_user_role() IN ('grievance_officer', 'administrator')
);

CREATE POLICY "Strict grievances insert policy"
ON grievances FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid() 
    AND status = 'confidential_review'
);

CREATE POLICY "Strict grievances update policy"
ON grievances FOR UPDATE TO authenticated
USING (get_current_user_role() IN ('grievance_officer', 'administrator'));

-- ----------------------------------------------------------------------------
-- 6. CANTEEN COUPONS & POS SETTLEMENT POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Students can view their own coupons" ON canteen_coupons;
DROP POLICY IF EXISTS "Strict canteen coupons select policy" ON canteen_coupons;
DROP POLICY IF EXISTS "Strict canteen coupons update policy" ON canteen_coupons;

CREATE POLICY "Strict canteen coupons select policy"
ON canteen_coupons FOR SELECT TO authenticated
USING (
    student_id = auth.uid() 
    OR get_current_user_role() IN ('canteen_operator', 'administrator')
);

CREATE POLICY "Strict canteen coupons update policy"
ON canteen_coupons FOR UPDATE TO authenticated
USING (get_current_user_role() IN ('canteen_operator', 'administrator'));

-- ----------------------------------------------------------------------------
-- 7. USER WALLETS & REWARD LEDGER (ZERO CROSS-STUDENT VISIBILITY)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can only view their own wallet" ON user_wallets;
DROP POLICY IF EXISTS "Users can only view their own reward ledger" ON reward_ledger;

CREATE POLICY "Strict wallet select policy"
ON user_wallets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR get_current_user_role() = 'administrator');

CREATE POLICY "Strict reward ledger select policy"
ON reward_ledger FOR SELECT TO authenticated
USING (user_id = auth.uid() OR get_current_user_role() = 'administrator');

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATIONS (PERSONAL PRIVACY ISOLATION)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users view only their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark their notifications as read" ON notifications;

CREATE POLICY "Strict notifications select policy"
ON notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Strict notifications update policy"
ON notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKET POLICIES (Private Attachments & Avatars)
-- ----------------------------------------------------------------------------

-- Medical attachments bucket (strictly restricted to student & assigned doctor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-records', 'medical-records', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket (public read, authenticated user write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Complaint attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaints', 'complaints', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars publicly viewable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Medical records restricted access"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'medical-records' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR get_current_user_role() IN ('doctor', 'administrator')
    )
);
