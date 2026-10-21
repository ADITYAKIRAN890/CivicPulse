-- ============================================================================
-- CivicsPulse Smart-Campus Database Schema
-- Migration 002: Row Level Security (RLS) & Atomic Stored Procedures
-- Prevents Double-Booking, Overspending, Duplicate Rewards & Race Conditions
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role from profiles
CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own non-privileged profile data"
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Cannot self-promote role!
    AND is_approved = (SELECT is_approved FROM profiles WHERE id = auth.uid()) -- Cannot self-approve!
);

-- 2. Doctors Directory Policies
CREATE POLICY "Doctors directory is viewable by all campus users"
ON doctors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Doctors can manage their own schedule and blocked dates"
ON doctors FOR UPDATE TO authenticated USING (user_id = auth.uid() OR get_current_user_role() = 'administrator');

-- 3. Appointments Policies
CREATE POLICY "Students see their own appointments"
ON appointments FOR SELECT TO authenticated 
USING (
    student_id = auth.uid() 
    OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR get_current_user_role() = 'administrator'
);

-- 4. Complaints Policies (Transparent Civic Feed)
CREATE POLICY "Campus members can view active complaints"
ON complaints FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can submit complaints"
ON complaints FOR INSERT TO authenticated 
WITH CHECK (student_id = auth.uid() AND status = 'submitted');

CREATE POLICY "Staff and admin can update complaint status"
ON complaints FOR UPDATE TO authenticated 
USING (
    get_current_user_role() IN ('department_staff', 'administrator') 
    OR (student_id = auth.uid() AND status IN ('resolved', 'verified_by_student', 'escalated'))
);

-- 5. Audit Logs Policies
CREATE POLICY "Audit logs are readable by all authenticated users"
ON complaint_audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "System and staff can insert audit logs"
ON complaint_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 6. GRIEVANCES: HIGH-SECURITY RESTRICTED POLICIES
-- General department staff and doctors CANNOT read grievances!
CREATE POLICY "Grievance confidentiality restriction"
ON grievances FOR SELECT TO authenticated 
USING (
    student_id = auth.uid() 
    OR get_current_user_role() IN ('grievance_officer', 'administrator')
);

CREATE POLICY "Students can submit confidential grievances"
ON grievances FOR INSERT TO authenticated 
WITH CHECK (student_id = auth.uid() AND status = 'confidential_review');

CREATE POLICY "Only Grievance Officers can update grievance files"
ON grievances FOR UPDATE TO authenticated 
USING (get_current_user_role() IN ('grievance_officer', 'administrator'));

-- 7. Canteen Catalog Policies
CREATE POLICY "Catalog items are viewable by all users"
ON canteen_catalog FOR SELECT TO authenticated USING (true);

-- 8. Wallets & Ledger Policies
CREATE POLICY "Users can only view their own wallet"
ON user_wallets FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR get_current_user_role() = 'administrator');

CREATE POLICY "Users can only view their own reward ledger"
ON reward_ledger FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR get_current_user_role() = 'administrator');

-- 9. Canteen Coupons Policies
CREATE POLICY "Students can view their own coupons"
ON canteen_coupons FOR SELECT TO authenticated 
USING (
    student_id = auth.uid() 
    OR get_current_user_role() IN ('canteen_operator', 'administrator')
);

-- 10. Notifications Policies
CREATE POLICY "Users view only their own notifications"
ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can mark their notifications as read"
ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());


-- ============================================================================
-- ATOMIC PL/PGSQL FUNCTIONS FOR RACE-CONDITION PREVENTION
-- ============================================================================

-- Function 1: Atomic Doctor Appointment Booking
CREATE OR REPLACE FUNCTION book_doctor_appointment(
    p_student_id UUID,
    p_doctor_id UUID,
    p_date DATE,
    p_time_slot TEXT,
    p_reason_category TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_doctor RECORD;
    v_existing_conflict UUID;
    v_new_id UUID;
    v_ref_code TEXT;
    v_res JSONB;
BEGIN
    -- 1. Lock doctor row for update to serialize concurrent bookings
    SELECT * INTO v_doctor FROM doctors WHERE id = p_doctor_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor not found in clinic registry.';
    END IF;

    -- 2. Verify blocked dates
    IF p_date = ANY(v_doctor.blocked_dates) THEN
        RAISE EXCEPTION 'Doctor is unavailable on %', p_date;
    END IF;

    -- 3. Check for slot conflict
    SELECT id INTO v_existing_conflict 
    FROM appointments 
    WHERE doctor_id = p_doctor_id 
      AND date = p_date 
      AND time_slot = p_time_slot 
      AND status NOT IN ('cancelled_by_student', 'cancelled_by_doctor')
    FOR UPDATE;

    IF v_existing_conflict IS NOT NULL THEN
        RAISE EXCEPTION 'Slot % on % is already booked.', p_time_slot, p_date;
    END IF;

    -- 4. Generate reference code
    v_ref_code := 'APT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

    -- 5. Insert appointment
    INSERT INTO appointments (
        reference_code, student_id, doctor_id, date, time_slot, reason_category, notes, status
    ) VALUES (
        v_ref_code, p_student_id, p_doctor_id, p_date, p_time_slot, p_reason_category, p_notes, 'confirmed'
    ) RETURNING id INTO v_new_id;

    -- 6. Trigger notification
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        p_student_id, 
        'Appointment Confirmed', 
        'Appointment confirmed with ' || v_doctor.full_name || ' on ' || p_date || ' at ' || p_time_slot || ' (' || v_doctor.clinic_cabin || '). Code: ' || v_ref_code,
        'appointment',
        '/appointments'
    );

    v_res := jsonb_build_object(
        'success', true,
        'appointment_id', v_new_id,
        'reference_code', v_ref_code,
        'doctor_name', v_doctor.full_name,
        'clinic_cabin', v_doctor.clinic_cabin,
        'date', p_date,
        'time_slot', p_time_slot
    );

    RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function 2: Atomic Single-Use Coupon Redemption
CREATE OR REPLACE FUNCTION redeem_canteen_coupon(
    p_coupon_code TEXT,
    p_operator_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
    v_operator RECORD;
    v_receipt_code TEXT;
BEGIN
    -- Check operator role
    SELECT * INTO v_operator FROM profiles WHERE id = p_operator_id;
    IF v_operator.role NOT IN ('canteen_operator', 'administrator') THEN
        RAISE EXCEPTION 'Unauthorized: Only canteen operators can redeem coupons.';
    END IF;

    -- Lock coupon row FOR UPDATE to prevent concurrent double-spend
    SELECT * INTO v_coupon FROM canteen_coupons 
    WHERE UPPER(coupon_code) = UPPER(TRIM(p_coupon_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon code % not found.', p_coupon_code;
    END IF;

    IF v_coupon.status = 'redeemed' THEN
        RAISE EXCEPTION 'Coupon % has ALREADY been redeemed on %.', v_coupon.coupon_code, v_coupon.redeemed_at;
    END IF;

    IF v_coupon.status = 'expired' OR v_coupon.expires_at < NOW() THEN
        RAISE EXCEPTION 'Coupon has expired.';
    END IF;

    v_receipt_code := 'RCPT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || FLOOR(1000 + RANDOM() * 9000)::TEXT;

    UPDATE canteen_coupons
    SET status = 'redeemed',
        redeemed_at = NOW(),
        redeemed_by_operator_id = p_operator_id,
        redemption_receipt_code = v_receipt_code
    WHERE id = v_coupon.id;

    RETURN jsonb_build_object(
        'success', true,
        'coupon_code', v_coupon.coupon_code,
        'title', v_coupon.title,
        'monetary_value_rupees', v_coupon.monetary_value_rupees,
        'receipt_code', v_receipt_code,
        'redeemed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function 3: Idempotent Reward Milestone Awarding
CREATE OR REPLACE FUNCTION award_complaint_milestone(
    p_complaint_id UUID,
    p_milestone TEXT -- 'triage' or 'resolution'
)
RETURNS JSONB AS $$
DECLARE
    v_complaint RECORD;
    v_points INTEGER;
    v_idempotency_key TEXT;
    v_existing RECORD;
    v_wallet RECORD;
BEGIN
    SELECT * INTO v_complaint FROM complaints WHERE id = p_complaint_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Complaint not found.';
    END IF;

    IF p_milestone = 'triage' THEN
        v_points := 25;
        v_idempotency_key := 'reward_' || p_complaint_id || '_triage_' || v_complaint.student_id;
        IF v_complaint.points_awarded_triage THEN
            RETURN jsonb_build_object('success', false, 'reason', 'Triage points already awarded');
        END IF;
    ELSIF p_milestone = 'resolution' THEN
        v_points := 50;
        v_idempotency_key := 'reward_' || p_complaint_id || '_resolution_' || v_complaint.student_id;
        IF v_complaint.points_awarded_resolution THEN
            RETURN jsonb_build_object('success', false, 'reason', 'Resolution points already awarded');
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid milestone type.';
    END IF;

    -- Check if idempotency key exists in ledger
    SELECT * INTO v_existing FROM reward_ledger WHERE idempotency_key = v_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Idempotency key already executed');
    END IF;

    -- Update or initialize wallet
    INSERT INTO user_wallets (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
    VALUES (v_complaint.student_id, v_points, v_points, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = user_wallets.balance + v_points,
        lifetime_earned = user_wallets.lifetime_earned + v_points,
        updated_at = NOW()
    RETURNING balance INTO v_wallet;

    -- Record ledger entry
    INSERT INTO reward_ledger (
        idempotency_key, user_id, amount, balance_after, transaction_type, reference_id, description
    ) VALUES (
        v_idempotency_key, 
        v_complaint.student_id, 
        v_points, 
        v_wallet.balance, 
        CASE WHEN p_milestone = 'triage' THEN 'complaint_triage_reward' ELSE 'complaint_resolution_reward' END,
        p_complaint_id::TEXT,
        'Milestone reward for ' || v_complaint.reference_code || ' (' || p_milestone || ')'
    );

    IF p_milestone = 'triage' THEN
        UPDATE complaints SET points_awarded_triage = TRUE WHERE id = p_complaint_id;
    ELSE
        UPDATE complaints SET points_awarded_resolution = TRUE WHERE id = p_complaint_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'points_awarded', v_points, 'new_balance', v_wallet.balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
