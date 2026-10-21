'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Ban,
  Activity,
} from 'lucide-react';
import { Doctor, Appointment, UserProfile } from '@/types';

export default function DoctorPortalPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayString, setTodayString] = useState('');
  const [blockedDateInput, setBlockedDateInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const loadDoctorData = async () => {
    try {
      const [sessionRes, docRes, aptRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/doctors'),
        fetch('/api/appointments'),
      ]);
      const [sessionData, docData, aptData] = await Promise.all([
        sessionRes.json(),
        docRes.json(),
        aptRes.json(),
      ]);

      if (sessionData.success) setCurrentUser(sessionData.user);
      if (docData.success && sessionData.user) {
        // Find doctor profile for this user or first doctor for admin
        const myDoc =
          docData.doctors.find((d: Doctor) => d.userId === sessionData.user.id) ||
          docData.doctors[0];
        setDoctorProfile(myDoc);
      }
      if (aptData.success) {
        setAppointments(aptData.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load doctor portal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayString(new Date().toISOString().split('T')[0]);
    loadDoctorData();
  }, []);

  const handleUpdateStatus = async (aptId: string, status: any, reason?: string) => {
    setIsUpdatingStatus(aptId);
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }
      await loadDoctorData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      alert('Status update error: ' + msg);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleToggleBlockDate = async (date: string, action: 'block' | 'unblock') => {
    if (!doctorProfile) return;
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctorProfile.id,
          date,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDoctorProfile(data.doctor);
        alert(`Date ${date} ${action === 'block' ? 'marked as leave/blocked' : 'unblocked'}!`);
      }
    } catch (err) {
      alert('Failed to update leave dates: ' + err);
    }
  };

  // Restrict access check: Doctors or Admins only
  const isAuthorized = currentUser?.role === 'doctor' || currentUser?.role === 'administrator';

  if (!loading && !isAuthorized) {
    return (
      <div className="p-12 glass-card rounded-3xl text-center space-y-4 max-w-lg mx-auto">
        <Stethoscope className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Doctor Portal Access Restricted</h2>
        <p className="text-xs text-slate-400">
          You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
          To test this interface, use the <strong>Persona Switcher</strong> in the top header and switch to <strong>Dr. Priya Patel</strong>.
        </p>
      </div>
    );
  }

  const activeConsultations = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'in_consultation'
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Clinic Staff & Physician Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Doctor Consultation Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage patient queue, consultation attendance, clinic cabin availability, and leave dates.
          </p>
        </div>

        {doctorProfile && (
          <div className="flex items-center space-x-3 p-3 rounded-2xl glass-card border border-emerald-500/30">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              Dr
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{doctorProfile.fullName}</h3>
              <p className="text-xs text-emerald-400">{doctorProfile.specialization}</p>
              <p className="text-[10px] text-slate-400">{doctorProfile.clinicCabin}</p>
            </div>
          </div>
        )}
      </div>

      {/* Medical Privacy Reminder */}
      <div className="p-4 rounded-2xl glass-card border border-emerald-900/40 bg-emerald-950/20 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-bold text-white block">Medical Confidentiality Standard</span>
          This campus hub handles scheduling and queue logistics only. Do not input detailed diagnoses, private medical histories, or prescriptions into public fields.
        </div>
      </div>

      {/* Today's Queue & Leave Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Active Consultations Queue ({activeConsultations.length})</span>
            </h2>
            <button
              onClick={loadDoctorData}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {activeConsultations.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">All caught up! No waiting patients.</p>
              <p className="text-xs text-slate-500 mt-1">Confirmed bookings will appear here in chronological order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeConsultations.map((apt) => (
                <div
                  key={apt.id}
                  className="glass-card p-5 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {apt.referenceCode}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{apt.date} at {apt.timeSlot}</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          apt.status === 'in_consultation'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {apt.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white pt-1">
                      {apt.studentName} ({apt.studentRollNumber || 'Student'})
                    </h4>
                    <p className="text-xs text-slate-300">
                      Reason: <strong className="text-white">{apt.reasonCategory}</strong>
                    </p>
                    {apt.notes && (
                      <p className="text-[11px] text-slate-400 italic">Notes: {apt.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {apt.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'in_consultation')}
                        disabled={isUpdatingStatus === apt.id}
                        className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md transition"
                      >
                        Start Consultation
                      </button>
                    )}

                    <button
                      onClick={() => handleUpdateStatus(apt.id, 'completed')}
                      disabled={isUpdatingStatus === apt.id}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition"
                    >
                      Mark Completed
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt('Reason for doctor cancellation / no-show:');
                        if (reason) handleUpdateStatus(apt.id, 'cancelled_by_doctor', reason);
                      }}
                      disabled={isUpdatingStatus === apt.id}
                      className="py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition"
                    >
                      No Show / Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Block Dates & Availability */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>Block Dates & Leave</span>
            </h2>
            <p className="text-xs text-slate-400">
              Mark emergency leave or conference days to automatically prevent students from booking slots on those dates.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                min={todayString}
                value={blockedDateInput}
                onChange={(e) => setBlockedDateInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
              />
              <button
                onClick={() => {
                  if (blockedDateInput) {
                    handleToggleBlockDate(blockedDateInput, 'block');
                    setBlockedDateInput('');
                  }
                }}
                disabled={!blockedDateInput}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-xs"
              >
                Block Date
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Currently Blocked Dates:</span>
              {doctorProfile?.blockedDates?.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No blocked dates. Fully available for consultations.</p>
              ) : (
                <div className="space-y-1.5">
                  {doctorProfile?.blockedDates?.map((d) => (
                    <div
                      key={d}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-rose-300">{d}</span>
                      <button
                        onClick={() => handleToggleBlockDate(d, 'unblock')}
                        className="text-[10px] text-slate-400 hover:text-white underline"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
