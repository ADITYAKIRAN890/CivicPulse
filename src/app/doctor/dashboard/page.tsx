'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Filter,
  MapPin,
  ChevronDown,
  User,
  FileText,
  Sparkles,
  Layers,
  Settings,
} from 'lucide-react';
import { Doctor, Appointment, UserProfile, AppointmentStatus } from '@/types';

const TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Active view tab
  const [activeTab, setActiveTab] = useState<'queue' | 'all' | 'schedule'>('queue');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', 'upcoming', 'past', or specific 'YYYY-MM-DD'
  const [customDate, setCustomDate] = useState<string>('');

  // Modal States
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('');
  const [rescheduleReservedSlots, setRescheduleReservedSlots] = useState<string[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('No show at clinic cabin');
  const [isCancelling, setIsCancelling] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Schedule Management States
  const [blockedDateInput, setBlockedDateInput] = useState('');
  const [scheduleActiveDays, setScheduleActiveDays] = useState<string[]>([]);
  const [consultationHoursInput, setConsultationHoursInput] = useState('');
  const [clinicCabinInput, setClinicCabinInput] = useState('');
  const [breakTimes, setBreakTimes] = useState<string[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [todayIso, setTodayIso] = useState('2026-10-22');

  useEffect(() => {
    setTodayIso(new Date().toISOString().split('T')[0]);
  }, []);
  // Load session, doctors, and appointments
  const loadDoctorData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
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

      if (sessionData.success && sessionData.user) {
        setCurrentUser(sessionData.user);
      }

      if (docData.success && Array.isArray(docData.doctors)) {
        setAllDoctors(docData.doctors);
        const myDoc =
          docData.doctors.find((d: Doctor) => d.userId === sessionData?.user?.id) ||
          docData.doctors[0];
        setDoctorProfile(myDoc);

        if (myDoc) {
          setScheduleActiveDays(myDoc.activeDays || []);
          setConsultationHoursInput(myDoc.consultationHours || '');
          setClinicCabinInput(myDoc.clinicCabin || '');
          setBreakTimes(myDoc.breakTimes || []);
        }
      }

      if (aptData.success && Array.isArray(aptData.appointments)) {
        setAppointments(aptData.appointments);
      }

      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load doctor dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDoctorData();

    // Two-way synchronization polling every 6 seconds
    const interval = setInterval(() => {
      loadDoctorData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Fetch reserved slots for reschedule modal
  useEffect(() => {
    if (!rescheduleDate || !doctorProfile) return;
    async function fetchReserved() {
      try {
        const res = await fetch(`/api/appointments?doctorId=${doctorProfile?.id}&date=${rescheduleDate}&availabilityOnly=true`);
        const data = await res.json();
        if (data.success && Array.isArray(data.reservedSlots)) {
          setRescheduleReservedSlots(data.reservedSlots);
        }
      } catch (err) {
        console.error('Failed to fetch slots for rescheduling:', err);
      }
    }
    fetchReserved();
  }, [rescheduleDate, doctorProfile?.id]);

  // Handle status update (in_consultation, completed)
  const handleUpdateStatus = async (aptId: string, status: AppointmentStatus, reason?: string) => {
    setIsUpdatingStatus(aptId);
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update consultation status');
      }
      await loadDoctorData(true);
      if (selectedAppointment && selectedAppointment.id === aptId) {
        setSelectedAppointment(data.appointment);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      alert('Status update error: ' + msg);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle Reschedule by Doctor
  const handleConfirmReschedule = async () => {
    if (!reschedulingApt || !rescheduleDate || !rescheduleSlot) {
      setRescheduleError('Please select both a new date and an available consultation time slot.');
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);
    try {
      const res = await fetch(`/api/appointments/${reschedulingApt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          newDate: rescheduleDate,
          newTimeSlot: rescheduleSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reschedule appointment');
      }

      setReschedulingApt(null);
      await loadDoctorData(true);
      alert(`Appointment ${reschedulingApt.referenceCode} rescheduled to ${rescheduleDate} at ${rescheduleSlot}! Student has been notified.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reschedule failed';
      setRescheduleError(msg);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Handle Cancel / No Show by Doctor
  const handleConfirmCancel = async () => {
    if (!cancellingApt) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${cancellingApt.id}?reason=${encodeURIComponent(cancellationReason)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      setCancellingApt(null);
      await loadDoctorData(true);
      alert(`Appointment ${cancellingApt.referenceCode} marked cancelled with reason logged.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed';
      alert('Cancellation error: ' + msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // Block / Unblock Date
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
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update leave dates');
      setDoctorProfile(data.doctor);
      setScheduleNotice({
        type: 'success',
        message: `Date ${date} ${action === 'block' ? 'marked as leave/blocked' : 'unblocked'}! Student booking is updated.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating leave dates';
      setScheduleNotice({ type: 'error', message: msg });
    }
  };

  // Save Doctor Schedule Settings (Active Days, Hours, Break Times)
  const handleSaveScheduleSettings = async () => {
    if (!doctorProfile) return;
    setIsSavingSchedule(true);
    setScheduleNotice(null);
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctorProfile.id,
          action: 'update_schedule',
          updates: {
            activeDays: scheduleActiveDays,
            consultationHours: consultationHoursInput,
            clinicCabin: clinicCabinInput,
            breakTimes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update schedule');

      setDoctorProfile(data.doctor);
      setScheduleNotice({
        type: 'success',
        message: 'Doctor consultation schedule & availability saved successfully! All existing confirmed bookings remain intact.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update schedule';
      setScheduleNotice({ type: 'error', message: msg });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Switch doctor profile (if admin or demo testing)
  const handleSelectDoctorView = (docId: string) => {
    const doc = allDoctors.find((d) => d.id === docId);
    if (doc) {
      setDoctorProfile(doc);
      setScheduleActiveDays(doc.activeDays || []);
      setConsultationHoursInput(doc.consultationHours || '');
      setClinicCabinInput(doc.clinicCabin || '');
      setBreakTimes(doc.breakTimes || []);
    }
  };

  // Access Control: Doctors and Administrators
  const isAuthorized = currentUser?.role === 'doctor' || currentUser?.role === 'administrator';

  // Doctor's scoped appointments
  const myDoctorAppointments = useMemo(() => {
    if (!doctorProfile) return [];
    return appointments.filter((a) => a.doctorId === doctorProfile.id);
  }, [appointments, doctorProfile]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const today = todayIso;
    const todayApts = myDoctorAppointments.filter((a) => a.date === today);
    const upcoming = myDoctorAppointments.filter(
      (a) => a.date >= today && !['completed', 'cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
    );
    const confirmed = myDoctorAppointments.filter((a) => a.status === 'confirmed');
    const inConsultation = myDoctorAppointments.filter((a) => a.status === 'in_consultation');
    const completed = myDoctorAppointments.filter((a) => a.status === 'completed');
    const cancelled = myDoctorAppointments.filter((a) =>
      ['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
    );

    return {
      todayCount: todayApts.length,
      upcomingCount: upcoming.length,
      confirmedCount: confirmed.length,
      inConsultationCount: inConsultation.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      totalCount: myDoctorAppointments.length,
    };
  }, [myDoctorAppointments, todayIso]);

  // Filtered Appointments List
  const filteredAppointments = useMemo(() => {
    return myDoctorAppointments.filter((apt) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = apt.referenceCode.toLowerCase().includes(q);
        const matchesStudent = apt.studentName.toLowerCase().includes(q);
        const matchesRoll = apt.studentRollNumber?.toLowerCase().includes(q);
        const matchesReason = apt.reasonCategory.toLowerCase().includes(q);
        const matchesNotes = apt.notes?.toLowerCase().includes(q);
        if (!matchesRef && !matchesStudent && !matchesRoll && !matchesReason && !matchesNotes) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'cancelled') {
          if (!['cancelled_by_student', 'cancelled_by_doctor'].includes(apt.status)) return false;
        } else if (apt.status !== statusFilter) {
          return false;
        }
      }

      // Date filter
      if (dateFilter === 'today') {
        if (apt.date !== todayIso) return false;
      } else if (dateFilter === 'upcoming') {
        if (apt.date < todayIso || ['completed', 'cancelled_by_student', 'cancelled_by_doctor'].includes(apt.status)) {
          return false;
        }
      } else if (dateFilter === 'past') {
        if (apt.date > todayIso && !['completed', 'cancelled_by_student', 'cancelled_by_doctor'].includes(apt.status)) {
          return false;
        }
      } else if (dateFilter === 'custom' && customDate) {
        if (apt.date !== customDate) return false;
      }

      return true;
    });
  }, [myDoctorAppointments, searchQuery, statusFilter, dateFilter, customDate, todayIso]);

  // Today's Active Consultation Queue
  const todayActiveQueue = useMemo(() => {
    return myDoctorAppointments.filter(
      (a) => a.date === todayIso && !['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
    );
  }, [myDoctorAppointments, todayIso]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] py-16 px-4">
        <div className="max-w-md mx-auto p-8 rounded-3xl bg-white border-[3.5px] border-black shadow-[6px_6px_0px_#000] text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-black" />
          <p className="text-sm font-black text-black">Connecting to Clinical Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] py-12 px-4">
        <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black">
          <div className="w-16 h-16 rounded-2xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
            <Stethoscope className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-2xl font-black text-black">Doctor Portal Access Restricted</h2>
          <p className="text-xs font-bold text-neutral-700 leading-relaxed">
            You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
            To access this dashboard, use the <strong>Persona Switcher</strong> in the top navigation bar and select <strong>Dr. Priya Patel</strong>.
          </p>
          <div className="pt-4 border-t-2 border-black flex justify-center">
            <Link
              href="/appointments"
              className="px-4 py-2 rounded-xl bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000]"
            >
              Go to Student Appointments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] pb-16 text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* Top Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#A3E635] border-[3.5px] border-black shadow-[6px_6px_0px_#000] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase tracking-wider mb-3">
              <Stethoscope className="w-4 h-4 text-black" />
              <span>Physician Command Hub</span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping ml-1" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
              Doctor Consultation Dashboard
            </h1>
            <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 max-w-xl">
              Real-time patient queue, appointment confirmations, rescheduling, and live schedule availability management.
            </p>
          </div>

          {/* Doctor Profile Badge */}
          {doctorProfile && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
              <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000] overflow-hidden shrink-0 flex items-center justify-center font-black text-lg text-black">
                {doctorProfile.avatarUrl ? (
                  <img src={doctorProfile.avatarUrl} alt={doctorProfile.fullName} className="w-full h-full object-cover" />
                ) : (
                  doctorProfile.fullName.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-base text-black truncate">{doctorProfile.fullName}</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#38BDF8] text-black border border-black shadow-[1px_1px_0px_#000]">
                    Verified MD
                  </span>
                </div>
                <p className="text-xs font-bold text-neutral-800">{doctorProfile.specialization}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-neutral-600 mt-0.5">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-black" />
                    <span>{doctorProfile.clinicCabin}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-black" />
                    <span>{doctorProfile.consultationHours}</span>
                  </span>
                </div>
              </div>

              {/* Admin Doctor Switcher */}
              {currentUser?.role === 'administrator' && allDoctors.length > 1 && (
                <div className="sm:ml-2 pt-2 sm:pt-0 sm:border-l-2 sm:border-black sm:pl-3">
                  <label className="block text-[10px] font-black uppercase text-neutral-600">Switch Doctor View</label>
                  <select
                    value={doctorProfile.id}
                    onChange={(e) => handleSelectDoctorView(e.target.value)}
                    className="mt-1 px-2 py-1 text-xs font-bold bg-[#FAF7EE] border border-black rounded-lg shadow-[1.5px_1.5px_0px_#000] outline-none"
                  >
                    {allDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fullName} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Status & Medical Confidentiality Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-3.5 rounded-2xl bg-[#FEF08A] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-black shrink-0" />
            <p className="text-xs text-neutral-900 font-bold">
              <strong className="text-black font-black">Strict Medical Confidentiality: </strong>
              This portal manages consultation logistics and cabin queues only. Detailed medical diagnoses, lab values and clinical histories are never stored in public records.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-neutral-500 uppercase block leading-none">Shared Persistence Engine</span>
              <span className="text-xs font-black text-black flex items-center space-x-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span>Live Synced ({lastSyncTime || 'Active'})</span>
              </span>
            </div>
            <button
              onClick={() => loadDoctorData()}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#FAF7EE] hover:bg-[#FFE600] border-2 border-black shadow-[1.5px_1.5px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 text-black ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-[#FFE600] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-800 block">Today's Visits</span>
            <p className="text-2xl sm:text-3xl font-black text-black mt-1">{metrics.todayCount}</p>
          </div>
          <div className="bg-[#38BDF8] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-800 block">Upcoming</span>
            <p className="text-2xl sm:text-3xl font-black text-black mt-1">{metrics.upcomingCount}</p>
          </div>
          <div className="bg-[#A3E635] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-800 block">Confirmed</span>
            <p className="text-2xl sm:text-3xl font-black text-black mt-1">{metrics.confirmedCount}</p>
          </div>
          <div className="bg-[#FFF066] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-800 block">In Consultation</span>
            <p className="text-2xl sm:text-3xl font-black text-black mt-1">{metrics.inConsultationCount}</p>
          </div>
          <div className="bg-[#C084FC] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-800 block">Completed</span>
            <p className="text-2xl sm:text-3xl font-black text-black mt-1">{metrics.completedCount}</p>
          </div>
          <div className="bg-[#FB7185] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-800 block">Cancelled</span>
            <p className="text-2xl sm:text-3xl font-black text-black mt-1">{metrics.cancelledCount}</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center space-x-2 ${
                activeTab === 'queue'
                  ? 'bg-[#FFE600] text-black'
                  : 'bg-white text-black hover:bg-[#FAF7EE]'
              }`}
            >
              <Activity className="w-4 h-4 text-black" />
              <span>Today's Live Queue ({todayActiveQueue.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center space-x-2 ${
                activeTab === 'all'
                  ? 'bg-[#38BDF8] text-black'
                  : 'bg-white text-black hover:bg-[#FAF7EE]'
              }`}
            >
              <Layers className="w-4 h-4 text-black" />
              <span>All Appointments ({myDoctorAppointments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition border-2 border-black shadow-[2.5px_2.5px_0px_#000] flex items-center space-x-2 ${
                activeTab === 'schedule'
                  ? 'bg-[#A3E635] text-black'
                  : 'bg-white text-black hover:bg-[#FAF7EE]'
              }`}
            >
              <Settings className="w-4 h-4 text-black" />
              <span>Schedule & Availability</span>
            </button>
          </div>

          <div className="text-xs font-bold text-neutral-700">
            Current Date: <strong className="text-black font-black">{todayIso}</strong>
          </div>
        </div>

        {/* TAB 1 & TAB 2: APPOINTMENT LIST VIEWS */}
        {(activeTab === 'queue' || activeTab === 'all') && (
          <div className="space-y-6">

            {/* Search & Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by student name, roll #, ref code (e.g. APT-2026-LS456), reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Dropdown */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-black text-neutral-700">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_consultation">In Consultation</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled (Any)</option>
                    <option value="cancelled_by_student">Cancelled by Student</option>
                    <option value="cancelled_by_doctor">Cancelled by Doctor</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-black text-neutral-700">Date:</span>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] outline-none"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today Only</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past / Completed</option>
                    <option value="custom">Pick Specific Date</option>
                  </select>
                  {dateFilter === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="px-2 py-1 rounded-lg border-2 border-black text-xs font-bold"
                    />
                  )}
                </div>

                {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDateFilter('all');
                      setCustomDate('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-xs font-black border border-black"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Appointments Grid */}
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-black border-[3px] border-black shadow-[6px_6px_0px_#000] space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#A3E635] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
                  <CheckCircle2 className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-lg font-black text-black">No appointments found matching filters</h3>
                <p className="text-xs font-bold text-neutral-600 max-w-md mx-auto">
                  {myDoctorAppointments.length === 0
                    ? `No consultations currently booked for ${doctorProfile?.fullName}. Bookings made on the student page appear here in real-time.`
                    : 'Try clearing your search query or adjusting your date/status filter criteria.'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/appointments"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000]"
                  >
                    <span>View Student Booking Page</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAppointments.map((apt) => {
                  const isToday = apt.date === todayIso;
                  const isConfirmed = apt.status === 'confirmed';
                  const isInConsultation = apt.status === 'in_consultation';
                  const isCompleted = apt.status === 'completed';
                  const isCancelled = apt.status === 'cancelled_by_student' || apt.status === 'cancelled_by_doctor';

                  return (
                    <div
                      key={apt.id}
                      className={`bg-white p-5 rounded-3xl border-[3px] border-black shadow-[5px_5px_0px_#000] space-y-4 transition ${
                        isInConsultation ? 'ring-4 ring-[#FFE600]' : ''
                      }`}
                    >
                      {/* Card Header: Reference & Status Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-[#38BDF8] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                              {apt.referenceCode}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFE600] text-black border border-black">
                                TODAY
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-black text-black pt-1">
                            {apt.studentName}
                          </h4>
                          <p className="text-xs font-bold text-neutral-600">
                            Roll: <strong className="text-black">{apt.studentRollNumber || 'CS2023-042'}</strong> · {apt.studentEmail}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0px_#000] shrink-0 ${
                            isCompleted
                              ? 'bg-[#C084FC] text-black'
                              : isInConsultation
                              ? 'bg-[#FFE600] text-black animate-pulse'
                              : isCancelled
                              ? 'bg-[#FB7185] text-black'
                              : 'bg-[#A3E635] text-black'
                          }`}
                        >
                          {apt.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Consultation Details */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#FAF7EE] border-2 border-black/80 text-xs font-semibold">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-black shrink-0" />
                          <span className="font-bold text-black">{apt.date}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                          <span className="font-bold text-black">{apt.timeSlot}</span>
                        </div>
                        <div className="col-span-2 text-neutral-800 pt-1 border-t border-black/20 text-[11px]">
                          Category: <strong className="text-black">{apt.reasonCategory}</strong>
                        </div>
                        {apt.notes && (
                          <div className="col-span-2 text-neutral-700 italic text-[11px]">
                            Student Notes: "{apt.notes}"
                          </div>
                        )}
                        {apt.cancellationReason && (
                          <div className="col-span-2 text-[#991B1B] font-bold text-[11px] bg-rose-100 p-1.5 rounded border border-rose-300">
                            Cancellation Reason: {apt.cancellationReason}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t-2 border-black/20">
                        {isConfirmed && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'in_consultation')}
                            disabled={isUpdatingStatus === apt.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                          >
                            Start Consultation
                          </button>
                        )}

                        {isInConsultation && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                            disabled={isUpdatingStatus === apt.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                          >
                            Mark Completed
                          </button>
                        )}

                        {!isCompleted && !isCancelled && (
                          <>
                            <button
                              onClick={() => {
                                setReschedulingApt(apt);
                                setRescheduleDate(apt.date);
                                setRescheduleSlot('');
                                setRescheduleError(null);
                              }}
                              className="py-2 px-3 rounded-xl bg-[#38BDF8] hover:bg-sky-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                            >
                              Reschedule
                            </button>

                            <button
                              onClick={() => {
                                setCancellingApt(apt);
                                setCancellationReason('No show at clinic cabin / student requested cancellation');
                              }}
                              className="py-2 px-3 rounded-xl bg-[#FB7185] hover:bg-rose-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-100 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULE & AVAILABILITY MANAGEMENT */}
        {activeTab === 'schedule' && doctorProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Card: Blocked Dates & Leave Days */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-[3.5px] border-black shadow-[6px_6px_0px_#000] space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#FB7185] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-black">
                  <Ban className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">Leave & Blocked Dates</h3>
                  <p className="text-xs font-bold text-neutral-600">
                    Students will be immediately prevented from booking any slots on these dates.
                  </p>
                </div>
              </div>

              {/* Add Blocked Date Form */}
              <div className="p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-3">
                <label className="block text-xs font-black text-black">Add Emergency Leave / Conference Date</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    min={todayIso}
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
                    className="py-2 px-4 rounded-xl bg-[#FB7185] hover:bg-rose-400 disabled:opacity-50 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                  >
                    Block Date
                  </button>
                </div>
              </div>

              {/* Currently Blocked Dates List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-black uppercase tracking-wider">
                  Currently Blocked Dates ({doctorProfile.blockedDates?.length || 0})
                </h4>

                {doctorProfile.blockedDates?.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-[#FAF7EE] border-2 border-black text-center text-xs font-bold text-neutral-600">
                    No dates currently blocked. Doctor is available across all regular working days.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {doctorProfile.blockedDates?.map((dateStr) => (
                      <div
                        key={dateStr}
                        className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Ban className="w-4 h-4 text-[#FB7185]" />
                          <span className="font-mono text-xs font-black text-black">{dateStr}</span>
                          <span className="text-[10px] font-bold text-neutral-600">
                            ({new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })})
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleBlockDate(dateStr, 'unblock')}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FB7185] text-black text-[11px] font-black border border-black shadow-[1px_1px_0px_#000] transition"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Active Days, Hours & Breaks */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-[3.5px] border-black shadow-[6px_6px_0px_#000] space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#A3E635] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-black">
                  <Calendar className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">Working Days, Hours & Breaks</h3>
                  <p className="text-xs font-bold text-neutral-600">
                    Configure weekly active consultation days and clinic break times.
                  </p>
                </div>
              </div>

              {scheduleNotice && (
                <div
                  className={`p-3.5 rounded-2xl border-2 border-black text-xs font-bold flex items-center space-x-2 ${
                    scheduleNotice.type === 'success'
                      ? 'bg-[#A3E635] text-black'
                      : 'bg-[#FB7185] text-black'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scheduleNotice.message}</span>
                </div>
              )}

              {/* Active Days Toggles */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-black">
                  Active Consultation Days of Week:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isActive = scheduleActiveDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setScheduleActiveDays(scheduleActiveDays.filter((d) => d !== day));
                          } else {
                            setScheduleActiveDays([...scheduleActiveDays, day]);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-black border-2 border-black transition shadow-[2px_2px_0px_#000] ${
                          isActive
                            ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_#000]'
                            : 'bg-white text-neutral-500 hover:bg-[#FAF7EE]'
                        }`}
                      >
                        {day.slice(0, 3)}
                        {isActive && <span className="block text-[9px] text-neutral-800 font-bold">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Consultation Hours & Clinic Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Clinic Cabin / Location</label>
                  <input
                    type="text"
                    value={clinicCabinInput}
                    onChange={(e) => setClinicCabinInput(e.target.value)}
                    placeholder="Cabin 102, Campus Health Center"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-black mb-1">Consultation Hours Text</label>
                  <input
                    type="text"
                    value={consultationHoursInput}
                    onChange={(e) => setConsultationHoursInput(e.target.value)}
                    placeholder="09:00 AM - 01:00 PM & 03:00 PM - 05:00 PM"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000]"
                  />
                </div>
              </div>

              {/* Clinic Lunch / Recess Breaks */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-black">
                  Designate Daily Doctor Recess / Break Slots:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isBreak = breakTimes.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          if (isBreak) {
                            setBreakTimes(breakTimes.filter((s) => s !== slot));
                          } else {
                            setBreakTimes([...breakTimes, slot]);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-black border-2 border-black transition shadow-[2px_2px_0px_#000] ${
                          isBreak
                            ? 'bg-[#FB7185] text-black shadow-[3px_3px_0px_#000]'
                            : 'bg-white text-black hover:bg-[#FAF7EE]'
                        }`}
                      >
                        {slot}
                        {isBreak && <span className="block text-[9px] text-black font-extrabold">Break</span>}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] font-semibold text-neutral-600 mt-1">
                  Selected break slots will be marked as "Doctor Break" on the student booking page.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveScheduleSettings}
                  disabled={isSavingSchedule}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  {isSavingSchedule ? 'Saving Schedule...' : 'Save Availability & Sync With Student Portal'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: APPOINTMENT DETAILS & STATUS HISTORY */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-[#38BDF8] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                  {selectedAppointment.referenceCode}
                </span>
                <h3 className="text-xl font-black text-black mt-2">
                  Consultation Record Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#FB7185] text-black shadow-[1.5px_1.5px_0px_#000]"
              >
                <XCircle className="w-5 h-5 text-black" />
              </button>
            </div>

            {/* Patient Card */}
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-2">
              <span className="text-[10px] font-black text-neutral-600 uppercase">Student / Patient Info</span>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black">
                  {selectedAppointment.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-black">{selectedAppointment.studentName}</h4>
                  <p className="text-xs font-bold text-neutral-700">
                    Roll #{selectedAppointment.studentRollNumber || 'CS2023-042'} · {selectedAppointment.studentEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule & Cabin Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-bold text-neutral-600 block">Consultation Date</span>
                <span className="font-black text-black text-sm">{selectedAppointment.date}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-bold text-neutral-600 block">Time Slot</span>
                <span className="font-black text-black text-sm">{selectedAppointment.timeSlot}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-bold text-neutral-600 block">Clinic Cabin</span>
                <span className="font-bold text-black">{selectedAppointment.clinicCabin}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-bold text-neutral-600 block">Reason Category</span>
                <span className="font-black text-black">{selectedAppointment.reasonCategory}</span>
              </div>
              {selectedAppointment.notes && (
                <div className="col-span-2 p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000]">
                  <span className="text-[10px] font-bold text-neutral-600 block">Student Remarks / Notes</span>
                  <p className="text-xs font-semibold text-neutral-800 italic">"{selectedAppointment.notes}"</p>
                </div>
              )}
            </div>

            {/* Audit Timestamps */}
            <div className="p-3 rounded-xl bg-neutral-100 border border-black text-[11px] font-semibold text-neutral-700 space-y-1">
              <div className="flex justify-between">
                <span>Created At:</span>
                <span className="font-mono text-black">{new Date(selectedAppointment.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-mono text-black">{new Date(selectedAppointment.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className="font-black uppercase text-black">{selectedAppointment.status.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center space-x-3 pt-2">
              {selectedAppointment.status === 'confirmed' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedAppointment.id, 'in_consultation');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#FFE600] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]"
                >
                  Start Consultation
                </button>
              )}
              {selectedAppointment.status === 'in_consultation' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedAppointment.id, 'completed');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#A3E635] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]"
                >
                  Mark Completed
                </button>
              )}
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 rounded-xl bg-white text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RESCHEDULE APPOINTMENT */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[#38BDF8] text-black border border-black">
                  {reschedulingApt.referenceCode}
                </span>
                <h3 className="text-lg font-black text-black mt-1">Reschedule Consultation</h3>
                <p className="text-xs font-bold text-neutral-600">
                  Patient: {reschedulingApt.studentName} · Currently: {reschedulingApt.date} at {reschedulingApt.timeSlot}
                </p>
              </div>
              <button
                onClick={() => setReschedulingApt(null)}
                className="p-1 rounded-lg border border-black bg-white hover:bg-[#FB7185]"
              >
                <XCircle className="w-5 h-5 text-black" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-[#FB7185] border-2 border-black text-xs font-black text-black flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-black mb-1">Pick New Date</label>
              <input
                type="date"
                min={todayIso}
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setRescheduleSlot('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Select Available Slot ({rescheduleDate || 'Date'})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isReserved = rescheduleReservedSlots.includes(slot);
                  const isBreak = doctorProfile?.breakTimes?.includes(slot);
                  const isCurrent = slot === reschedulingApt.timeSlot && rescheduleDate === reschedulingApt.date;
                  const isDisabled = (isReserved && !isCurrent) || isBreak;
                  const isSelected = rescheduleSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setRescheduleSlot(slot)}
                      className={`p-2 rounded-xl text-xs font-black border-2 border-black transition shadow-[1.5px_1.5px_0px_#000] ${
                        isDisabled
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_#000]'
                          : 'bg-white text-black hover:bg-[#FAF7EE]'
                      }`}
                    >
                      {slot}
                      {isCurrent && <span className="block text-[8px] text-blue-700">Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-3">
              <button
                onClick={handleConfirmReschedule}
                disabled={isRescheduling || !rescheduleDate || !rescheduleSlot}
                className="flex-1 py-2 rounded-xl bg-[#A3E635] hover:bg-lime-400 disabled:opacity-50 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] transition"
              >
                {isRescheduling ? 'Updating Slot...' : 'Confirm Reschedule'}
              </button>
              <button
                onClick={() => setReschedulingApt(null)}
                className="px-4 py-2 rounded-xl bg-white text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL / NO-SHOW CONFIRMATION */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-4">
            <h3 className="text-lg font-black text-black">
              Cancel Appointment: {cancellingApt.referenceCode}
            </h3>
            <p className="text-xs font-bold text-neutral-700">
              This action will release the time slot ({cancellingApt.timeSlot} on {cancellingApt.date}) back into the public booking pool and notify student {cancellingApt.studentName}.
            </p>

            <div>
              <label className="block text-xs font-black text-black mb-1">Reason for Cancellation / Remarks:</label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Student no-show at cabin / clinic emergency / doctor unavailable..."
                className="w-full p-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] outline-none"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2 rounded-xl bg-[#FB7185] hover:bg-rose-400 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] transition"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
              <button
                onClick={() => setCancellingApt(null)}
                className="px-4 py-2 rounded-xl bg-white text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000]"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
