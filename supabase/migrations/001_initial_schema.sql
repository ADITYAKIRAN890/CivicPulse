-- ============================================================================
-- CivicsPulse Smart-Campus Database Schema
-- Migration 001: Normalized Tables, Indexes, Constraints & Foreign Keys
-- Compatible with PostgreSQL 15+ & Supabase Free Tier
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase auth.users or standalone campus profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'doctor', 'department_staff', 'grievance_officer', 'administrator', 'canteen_operator')),
    roll_number TEXT,
    department TEXT,
    clinic_cabin TEXT,
    avatar_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. Doctors Directory
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    clinic_cabin TEXT NOT NULL,
    consultation_hours TEXT NOT NULL,
    bio TEXT,
    active_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    blocked_dates DATE[] DEFAULT ARRAY[]::DATE[],
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);

-- 3. Doctor Appointments (Primary Feature)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    reason_category TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_consultation', 'completed', 'cancelled_by_student', 'cancelled_by_doctor', 'rescheduled')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index to prevent double bookings on active (non-cancelled) slots
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_doctor_slot 
ON appointments(doctor_id, date, time_slot) 
WHERE status NOT IN ('cancelled_by_student', 'cancelled_by_doctor');

CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);

-- 4. Complaints & Civic Infrastructure Reports
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('hostel', 'electricity', 'wifi', 'hygiene', 'water', 'infrastructure', 'lab_equipment', 'cafeteria', 'classroom_av', 'security')),
    campus_zone TEXT NOT NULL,
    location_details TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'triaged', 'in_progress', 'resolved', 'verified_by_student', 'escalated')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    priority_score INTEGER NOT NULL DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
    priority_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_department TEXT NOT NULL,
    assigned_staff_id UUID REFERENCES profiles(id),
    student_id UUID NOT NULL REFERENCES profiles(id),
    is_anonymous BOOLEAN DEFAULT FALSE,
    upvotes INTEGER NOT NULL DEFAULT 1 CHECK (upvotes >= 0),
    upvoted_by UUID[] DEFAULT ARRAY[]::UUID[],
    resolution_notes TEXT,
    resolution_image_url TEXT,
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    is_duplicate_of UUID REFERENCES complaints(id),
    human_review_required BOOLEAN DEFAULT FALSE,
    points_awarded_triage BOOLEAN DEFAULT FALSE,
    points_awarded_resolution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_dept ON complaints(assigned_department);
CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id);

-- 5. Audit Trail for Complaint Lifecycle
CREATE TABLE IF NOT EXISTS complaint_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_complaint ON complaint_audit_logs(complaint_id);

-- 6. Strictly Restricted Staff Grievances (Separated from public complaints)
CREATE TABLE IF NOT EXISTS grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES profiles(id),
    is_anonymous BOOLEAN DEFAULT FALSE,
    target_department_or_role TEXT NOT NULL,
    subject TEXT NOT NULL,
    incident_description TEXT NOT NULL,
    incident_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'confidential_review' CHECK (status IN ('confidential_review', 'hearing_scheduled', 'investigation_active', 'resolved', 'dismissed')),
    hearing_scheduled_date TIMESTAMPTZ,
    hearing_notes TEXT,
    assigned_officer_id UUID REFERENCES profiles(id),
    confidential_resolution_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grievances_officer ON grievances(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_grievances_student ON grievances(student_id);

-- 7. Canteen Catalog Items
CREATE TABLE IF NOT EXISTS canteen_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    monetary_value_rupees INTEGER NOT NULL CHECK (monetary_value_rupees > 0),
    category TEXT NOT NULL CHECK (category IN ('meal', 'beverage', 'snack', 'stationery')),
    icon TEXT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Civic Wallets
CREATE TABLE IF NOT EXISTS user_wallets (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Idempotent Auditable Reward Ledger
CREATE TABLE IF NOT EXISTS reward_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL, -- Prevents duplicate reward awards
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive credit or negative debit
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('complaint_triage_reward', 'complaint_resolution_reward', 'coupon_redemption', 'admin_adjustment', 'ledger_reversal')),
    reference_id TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON reward_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_idempotency ON reward_ledger(idempotency_key);

-- 10. Single-Use Canteen Coupons
CREATE TABLE IF NOT EXISTS canteen_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_code TEXT UNIQUE NOT NULL,
    catalog_item_id UUID NOT NULL REFERENCES canteen_catalog(id),
    title TEXT NOT NULL,
    points_spent INTEGER NOT NULL CHECK (points_spent > 0),
    monetary_value_rupees INTEGER NOT NULL CHECK (monetary_value_rupees > 0),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by_operator_id UUID REFERENCES profiles(id),
    redemption_receipt_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_coupons_student ON canteen_coupons(student_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON canteen_coupons(coupon_code);

-- 11. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('appointment', 'complaint', 'reward', 'system', 'grievance')),
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
