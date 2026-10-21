'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  AlertTriangle,
  Gift,
  Shield,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Users,
  Building,
  Coffee,
  Check,
} from 'lucide-react';
import { Complaint, Appointment, UserProfile } from '@/types';

export default function HomePage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [cmpRes, aptRes, sessionRes] = await Promise.all([
          fetch('/api/complaints'),
          fetch('/api/appointments'),
          fetch('/api/auth/session'),
        ]);

        const [cmpData, aptData, sessionData] = await Promise.all([
          cmpRes.json(),
          aptRes.json(),
          sessionRes.json(),
        ]);

        if (cmpData.success) setComplaints(cmpData.complaints || []);
        if (aptData.success) setAppointments(aptData.appointments || []);
        if (sessionData.success) setCurrentUser(sessionData.user || null);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalComplaints = complaints.length;
  const resolvedCount = complaints.filter((c) => ['resolved', 'verified_by_student'].includes(c.status)).length;
  const activeBookings = appointments.filter((a) => a.status === 'confirmed').length;

  return (
    <div className="space-y-10 pb-12 text-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-[#FFE600] border-[3.5px] border-black shadow-[8px_8px_0px_#000]">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-black text-white text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" />
            <span>Smart Campus MVP · Zero Budget Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight leading-tight">
            Empowering Campus Health, Infrastructure & Civic Impact
          </h1>

          <p className="text-base sm:text-lg text-black font-semibold leading-relaxed">
            Welcome back, <span className="font-black underline decoration-2 decoration-black">{currentUser?.fullName || 'Campus Member'}</span>. 
            Civic Pulse unites doctor consultations, rapid facilities resolution, local explainable AI triage, 
            and an auditable single-use canteen rewards ledger.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/appointments"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-white hover:bg-[#38BDF8] text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition"
            >
              <Stethoscope className="w-4 h-4 text-black" />
              <span>Book Doctor Slot</span>
              <ArrowRight className="w-4 h-4 ml-1 text-black" />
            </Link>

            <Link
              href="/complaints"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#FB7185] hover:bg-rose-400 text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition"
            >
              <AlertTriangle className="w-4 h-4 text-black" />
              <span>Report Campus Issue</span>
            </Link>

            <Link
              href="/rewards"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition"
            >
              <Gift className="w-4 h-4 text-black" />
              <span>Civic Wallet & Coupons</span>
            </Link>

            <Link
              href="/people"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#C084FC] hover:bg-purple-300 text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition"
            >
              <Users className="w-4 h-4 text-black" />
              <span>People Database</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Real-time KPI Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border-[2.5px] border-black shadow-[5px_5px_0px_#000] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000] transition">
          <div className="flex items-center justify-between text-black mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Doctor Visits</span>
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-black">{loading ? '...' : activeBookings}</div>
          <p className="text-xs font-bold text-neutral-800 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            <span>Active Confirmed Slots</span>
          </p>
        </div>

        <div className="bg-white border-[2.5px] border-black shadow-[5px_5px_0px_#000] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000] transition">
          <div className="flex items-center justify-between text-black mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Civic Tickets</span>
            <div className="w-10 h-10 rounded-xl bg-[#FB923C] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-black">{loading ? '...' : totalComplaints}</div>
          <p className="text-xs font-bold text-neutral-800 mt-1 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-black" />
            <span>Tracked Issues</span>
          </p>
        </div>

        <div className="bg-white border-[2.5px] border-black shadow-[5px_5px_0px_#000] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000] transition">
          <div className="flex items-center justify-between text-black mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Resolved Rate</span>
            <div className="w-10 h-10 rounded-xl bg-[#A3E635] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <Check className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-black">
            {loading || totalComplaints === 0 ? '...' : `${Math.round((resolvedCount / totalComplaints) * 100)}%`}
          </div>
          <p className="text-xs font-bold text-neutral-800 mt-1 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-black" />
            <span>Proof Verified</span>
          </p>
        </div>

        <div className="bg-[#FEF08A] border-[2.5px] border-black shadow-[5px_5px_0px_#000] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000] transition">
          <div className="flex items-center justify-between text-black mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-800">Stack Cost</span>
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <Award className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-black">₹0.00</div>
          <p className="text-xs font-bold text-neutral-900 mt-1 flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-black" />
            <span>100% Free Stack & Local NLP</span>
          </p>
        </div>
      </section>

      {/* Primary Feature Sections Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">Core Campus Pillars</h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-700">Complete functional workflows built for students, doctors, staff & admins</p>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-md bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
            6 Active Roles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1: Doctor Appointments */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#38BDF8] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-black flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-black">Doctor Appointments</h3>
              <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                Doctor directory, consultation slots, instant booking, and rescheduling with database concurrency protection against double-booking. Doctor dashboard handles schedule blocks and attendance. Strictly zero medical diagnosis storage.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/appointments"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-[#38BDF8] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-[#7DD3FC] transition"
              >
                <span>Launch Doctor Hub</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Complaints & Local AI */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#FB923C] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-black flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-black">Civic Complaints & Local AI</h3>
              <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                Report hostel, electrical, Wi-Fi, hygiene, and lab issues. Pure TypeScript NLP engine checks duplicate suggestions and calculates explainable priority scores with hazard reasons. Full timestamped audit history and resolution proof.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/complaints"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-[#FB923C] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-orange-300 transition"
              >
                <span>Report & Track Issues</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Rewards & Single-Use Coupons */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#A3E635] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-black flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-black">Civic Rewards & Canteen POS</h3>
              <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                Points awarded strictly on validated triage and legitimate verified resolutions—never complaint quantity! Idempotent ledger, wallet balance checks, and atomic single-use canteen coupon redemption at the POS terminal.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/rewards"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-[#A3E635] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-lime-300 transition"
              >
                <span>View Wallet & Coupons</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>

          {/* Pillar 4: Staff Grievance Directorate */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#C084FC] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-black flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-black">Confidential Grievance Directorate</h3>
              <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                Strictly restricted workflow for staff-behaviour, misconduct, and ethics grievances. Isolated from department facilities staff and doctors. Accessible only to Grievance Officers and the Dean.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/grievance-portal"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-[#C084FC] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-purple-300 transition"
              >
                <span>Access Grievance Directorate</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>

          {/* Pillar 5: Facilities Staff Operations */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#38BDF8] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-black flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-black">Department Facilities Desk</h3>
              <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                Work order dispatch queue for Electrical, Wi-Fi, Water, and Hostel maintenance. Triage tickets (+25 pts to student), manage in-progress repairs, and upload resolution proof photos (+50 pts to student).
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/department-portal"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-[#38BDF8] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-sky-300 transition"
              >
                <span>Department Staff Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>

          {/* Pillar 6: Canteen POS Terminal */}
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#FFE600] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-black flex items-center justify-center">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-black">Canteen Operator POS</h3>
              <p className="text-xs font-medium text-neutral-700 leading-relaxed">
                Cashier terminal for scanning and verifying student canteen coupons. Enforces atomic single-use redemption, prevents duplicate voucher reuse, and issues digital redemption settlement receipts.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/canteen-pos"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-[#FFE600] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-yellow-300 transition"
              >
                <span>Operator POS Terminal</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Campus Civic Activity Ticker */}
      <section className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#A3E635] border-2 border-black animate-ping"></span>
            <h3 className="font-black text-base text-black">Live Campus Civic Activity Feed</h3>
          </div>
          <Link href="/complaints" className="text-xs font-black text-black bg-[#FAF7EE] border-2 border-black px-2.5 py-1 rounded shadow-[2px_2px_0px_#000] hover:bg-[#FFE600] transition">
            View All Reports →
          </Link>
        </div>

        <div className="mt-4 divide-y-2 divide-neutral-200">
          {complaints.slice(0, 3).map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black text-white font-black border border-black shadow-[1.5px_1.5px_0px_#000]">
                    {item.referenceCode}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                      item.priority === 'critical'
                        ? 'bg-[#FB7185] text-black'
                        : item.priority === 'high'
                        ? 'bg-[#FB923C] text-black'
                        : 'bg-[#38BDF8] text-black'
                    }`}
                  >
                    {item.priority} priority
                  </span>
                  <span className="text-xs font-bold text-neutral-700">· {item.campusZone}</span>
                </div>
                <h4 className="text-sm font-black text-black">{item.title}</h4>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                    item.status === 'resolved'
                      ? 'bg-[#A3E635] text-black'
                      : item.status === 'in_progress'
                      ? 'bg-[#38BDF8] text-black'
                      : 'bg-[#FFE600] text-black'
                  }`}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-bold text-black flex items-center space-x-1 bg-[#FAF7EE] border border-black px-2 py-0.5 rounded">
                  <TrendingUp className="w-3.5 h-3.5 text-black" />
                  <span>{item.upvotes} upvotes</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Zero-Cost Architecture Details for Hackathon Judges */}
      <section className="bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6">
        <h3 className="text-lg font-black text-black flex items-center space-x-2">
          <Shield className="w-5 h-5 text-black" />
          <span>Zero-Cost Architecture & Hackathon Evaluation Guide</span>
        </h3>
        <p className="text-xs font-semibold text-neutral-700 mt-2 leading-relaxed">
          Civic Pulse was architected with strict ₹0 budget adherence: Next.js 16 App Router on React 19, strict TypeScript, Tailwind CSS, Lucide icons, and dual persistence: Supabase Free Tier (PostgreSQL + RLS + PL/pgSQL atomic functions) with automatic zero-config local storage fallback.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 text-xs">
          <div className="p-4 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="font-black text-black text-sm block mb-1">Atomic Race-Condition Lock</span>
            <span className="text-neutral-700 font-medium leading-normal">
              Doctor slot reservations & coupon redemptions serialize through async mutexes and row locks to guarantee zero double-bookings.
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="font-black text-black text-sm block mb-1">Zero-Cost Local NLP</span>
            <span className="text-neutral-700 font-medium leading-normal">
              Cosine vector similarity & Jaccard tokenization flag duplicates and generate explainable priority scores without paid AI APIs.
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="font-black text-black text-sm block mb-1">Restricted Grievance Isolation</span>
            <span className="text-neutral-700 font-medium leading-normal">
              Ethics & harassment cases are strictly air-gapped from facilities staff and doctors; accessible only to Grievance Committee.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
