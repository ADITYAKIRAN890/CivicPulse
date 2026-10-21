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
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-12 glass-panel border border-blue-900/50 bg-gradient-to-br from-slate-900/90 via-blue-950/40 to-slate-900/90 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Campus MVP · Zero Budget Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Empowering Campus Health, Infrastructure & Civic Impact
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Welcome back, <span className="font-bold text-white">{currentUser?.fullName || 'Campus Member'}</span>. 
            CivicsPulse unites doctor consultations, rapid facilities resolution, local explainable AI triage, 
            and an auditable single-use canteen rewards ledger.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/appointments"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition hover:-translate-y-0.5"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Book Doctor Slot</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/complaints"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl glass-card hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm transition hover:-translate-y-0.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Report Campus Issue</span>
            </Link>

            <Link
              href="/rewards"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl glass-card hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm transition hover:-translate-y-0.5"
            >
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>Civic Wallet & Coupons</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Real-time KPI Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between text-blue-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Doctor Visits</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{loading ? '...' : activeBookings}</div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Confirmed Slots</span>
          </p>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between text-amber-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Civic Tickets</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{loading ? '...' : totalComplaints}</div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Tracked Infrastructure Reports</span>
          </p>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolved Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {loading || totalComplaints === 0 ? '...' : `${Math.round((resolvedCount / totalComplaints) * 100)}%`}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified with Proof Evidence</span>
          </p>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-2xl">
          <div className="flex items-center justify-between text-purple-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stack Cost</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">₹0.00</div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>100% Free Tier & Local NLP</span>
          </p>
        </div>
      </section>

      {/* Primary Feature Sections Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Core Campus Pillars</h2>
            <p className="text-xs sm:text-sm text-slate-400">Complete functional workflows built for students, doctors, staff & admins</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            6 Active Roles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1: Doctor Appointments */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-blue-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Doctor Appointments (Primary)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Doctor directory, consultation slots, instant booking, and rescheduling with database concurrency protection against double-booking. Doctor dashboard handles schedule blocks and attendance. Strictly zero medical diagnosis storage.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/appointments"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
              >
                <span>Launch Doctor Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Complaints & Local AI */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-amber-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Civic Complaints & Local AI</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Report hostel, electrical, Wi-Fi, hygiene, and lab issues. Pure TypeScript NLP engine checks duplicate suggestions and calculates explainable priority scores with hazard reasons. Full timestamped audit history and resolution proof.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/complaints"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                <span>Report & Track Issues</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Rewards & Single-Use Coupons */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-emerald-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Civic Rewards & Canteen POS</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Points awarded strictly on validated triage and legitimate verified resolutions—never complaint quantity! Idempotent ledger, wallet balance checks, and atomic single-use canteen coupon redemption at the POS terminal.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/rewards"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
              >
                <span>View Wallet & Coupons</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 4: Staff Grievance Directorate */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-purple-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Confidential Grievance Directorate</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Strictly restricted workflow for staff-behaviour, misconduct, and ethics grievances. Isolated from department facilities staff and doctors. Accessible only to Grievance Officers and the Dean.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/grievance-portal"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
              >
                <span>Access Grievance Directorate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 5: Facilities Staff Operations */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-cyan-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Department Facilities Desk</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Work order dispatch queue for Electrical, Wi-Fi, Water, and Hostel maintenance. Triage tickets (+25 pts to student), manage in-progress repairs, and upload resolution proof photos (+50 pts to student).
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/department-portal"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>Department Staff Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 6: Canteen POS Terminal */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-orange-500">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Canteen Operator POS</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cashier terminal for scanning and verifying student canteen coupons. Enforces atomic single-use redemption, prevents duplicate voucher reuse, and issues digital redemption settlement receipts.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/canteen-pos"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 transition"
              >
                <span>Operator POS Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Campus Civic Activity Ticker */}
      <section className="glass-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <h3 className="font-bold text-base text-white">Live Campus Civic Activity Feed</h3>
          </div>
          <Link href="/complaints" className="text-xs text-blue-400 hover:underline">
            View All Reports →
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-800/80">
          {complaints.slice(0, 3).map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold border border-slate-700">
                    {item.referenceCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.priority === 'critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : item.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {item.priority} priority
                  </span>
                  <span className="text-xs text-slate-400">· {item.campusZone}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100">{item.title}</h4>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    item.status === 'resolved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : item.status === 'in_progress'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>{item.upvotes} upvotes</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Zero-Cost Architecture Details for Hackathon Judges */}
      <section className="glass-card rounded-2xl p-6 border border-blue-900/40 bg-gradient-to-r from-blue-950/20 via-slate-900 to-indigo-950/20">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span>Zero-Cost Architecture & Hackathon Evaluation Guide</span>
        </h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          CivicsPulse was architected with strict ₹0 budget adherence: Next.js 16 App Router on React 19, strict TypeScript, Tailwind CSS, Lucide icons, and dual persistence: Supabase Free Tier (PostgreSQL + RLS + PL/pgSQL atomic functions) with automatic zero-config local storage fallback.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="font-bold text-blue-400 block mb-1">Atomic Race-Condition Lock</span>
            <span className="text-slate-400">
              Doctor slot reservations & coupon redemptions serialize through async mutexes and row locks to guarantee zero double-bookings.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">Zero-Cost Local NLP</span>
            <span className="text-slate-400">
              Cosine vector similarity & Jaccard tokenization flag duplicates and generate explainable priority scores without paid AI APIs.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="font-bold text-purple-400 block mb-1">Restricted Grievance Isolation</span>
            <span className="text-slate-400">
              Ethics & harassment cases are strictly air-gapped from facilities staff and doctors; accessible only to Grievance Committee.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
