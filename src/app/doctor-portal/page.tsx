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
      <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
          <Stethoscope className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-black text-black">Doctor Portal Access Restricted</h2>
        <p className="text-xs font-bold text-neutral-700 leading-relaxed">
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
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#A3E635] border-[3.5px] border-black shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase tracking-wider mb-3">
            <Stethoscope className="w-4 h-4 text-black" />
            <span>Clinic Staff & Physician Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Doctor Consultation Workspace
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 max-w-xl">
            Manage patient queue, consultation attendance, clinic cabin availability, and leave dates.
          </p>
        </div>

        {doctorProfile && (
          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
            <div className="w-12 h-12 rounded-xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000] text-black flex items-center justify-center font-black text-lg">
              Dr
            </div>
            <div>
              <h3 className="font-black text-sm text-black">{doctorProfile.fullName}</h3>
              <p className="text-xs font-bold text-neutral-800">{doctorProfile.specialization}</p>
              <p className="text-[11px] font-black text-neutral-600 font-mono">{doctorProfile.clinicCabin}</p>
            </div>
          </div>
        )}
      </div>

      {/* Medical Privacy Reminder */}
      <div className="p-4 rounded-2xl bg-[#FEF08A] border-2 border-black shadow-[3px_3px_0px_#000] flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-900">
          <span className="font-black text-black block text-sm">Medical Confidentiality Standard</span>
          This campus hub handles scheduling and queue logistics only. Do not input detailed diagnoses, private medical histories, or prescriptions into public fields.
        </div>
      </div>

      {/* Today's Queue & Leave Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-black flex items-center space-x-2">
              <Activity className="w-4 h-4 text-black" />
              <span>Active Consultations Queue ({activeConsultations.length})</span>
            </h2>
            <button
              onClick={loadDoctorData}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center space-x-1.5 transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {activeConsultations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-black border-[3px] border-black shadow-[5px_5px_0px_#000] space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#A3E635] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mx-auto text-black">
                <CheckCircle2 className="w-8 h-8 text-black" />
              </div>
              <p className="text-base font-black text-black">All caught up! No waiting patients.</p>
              <p className="text-xs font-bold text-neutral-600">Confirmed bookings will appear here in real-time chronological order.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeConsultations.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-[#38BDF8] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                        {apt.referenceCode}
                      </span>
                      <span className="text-xs font-bold text-neutral-800 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-black" />
                        <span>{apt.date} at {apt.timeSlot}</span>
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded uppercase border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                          apt.status === 'in_consultation'
                            ? 'bg-[#FFE600] text-black'
                            : 'bg-[#A3E635] text-black'
                        }`}
                      >
                        {apt.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-black pt-1">
                      {apt.studentName} ({apt.studentRollNumber || 'Student'})
                    </h4>
                    <p className="text-xs font-bold text-neutral-800">
                      Reason: <strong className="text-black underline">{apt.reasonCategory}</strong>
                    </p>
                    {apt.notes && (
                      <p className="text-[11px] font-medium text-neutral-700 italic bg-[#FAF7EE] p-2 rounded-lg border border-black">
                        Notes: {apt.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {apt.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'in_consultation')}
                        disabled={isUpdatingStatus === apt.id}
                        className="py-2 px-3.5 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                      >
                        Start Consultation
                      </button>
                    )}

                    <button
                      onClick={() => handleUpdateStatus(apt.id, 'completed')}
                      disabled={isUpdatingStatus === apt.id}
                      className="py-2 px-3.5 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                    >
                      Mark Completed
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt('Reason for doctor cancellation / no-show:');
                        if (reason) handleUpdateStatus(apt.id, 'cancelled_by_doctor', reason);
                      }}
                      disabled={isUpdatingStatus === apt.id}
                      className="py-2 px-3 rounded-xl bg-[#FB7185] hover:bg-rose-400 text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
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
          <div className="bg-white p-6 rounded-3xl border-[3px] border-black shadow-[5px_5px_0px_#000] space-y-4">
            <h2 className="text-base font-black text-black flex items-center space-x-2">
              <Ban className="w-4 h-4 text-black" />
              <span>Block Dates & Leave</span>
            </h2>
            <p className="text-xs font-bold text-neutral-700">
              Mark emergency leave or conference days to automatically prevent students from booking slots on those dates.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                min={todayString}
                value={blockedDateInput}
                onChange={(e) => setBlockedDateInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] outline-none"
              />
              <button
                onClick={() => {
                  if (blockedDateInput) {
                    handleToggleBlockDate(blockedDateInput, 'block');
                    setBlockedDateInput('');
                  }
                }}
                disabled={!blockedDateInput}
                className="py-2 px-3.5 rounded-xl bg-[#FB7185] hover:bg-rose-400 disabled:bg-neutral-200 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
              >
                Block Date
              </button>
            </div>

            <div className="pt-4 border-t-2 border-black space-y-2">
              <span className="text-xs font-black text-black block">Currently Blocked Dates:</span>
              {doctorProfile?.blockedDates?.length === 0 ? (
                <p className="text-[11px] font-bold text-neutral-500 italic">No blocked dates. Fully available for consultations.</p>
              ) : (
                <div className="space-y-2">
                  {doctorProfile?.blockedDates?.map((d) => (
                    <div
                      key={d}
                      className="p-2.5 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-black text-black">{d}</span>
                      <button
                        onClick={() => handleToggleBlockDate(d, 'unblock')}
                        className="text-xs font-black text-black bg-white hover:bg-[#FB7185] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]"
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
