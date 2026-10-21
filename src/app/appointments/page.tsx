'use client';

import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  User,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Doctor, Appointment, UserProfile } from '@/types';

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

const REASON_CATEGORIES = [
  'Routine Campus Health Clearance',
  'Fever, Cough or Seasonal Infection',
  'Sports Injury, Sprain or Muscle Strain',
  'Exam Stress, Anxiety & Wellness Counseling',
  'Lab Test Review & Physical Fitness',
  'Prescription Refill & Allergy Review',
];

export default function AppointmentsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [todayString, setTodayString] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>(REASON_CATEGORIES[0]);
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedSuccess, setBookedSuccess] = useState<Appointment | null>(null);

  // Reschedule Modal State
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'book' | 'my_appointments'>('book');

  const loadData = async () => {
    try {
      const [docRes, aptRes, sessionRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/appointments'),
        fetch('/api/auth/session'),
      ]);
      const [docData, aptData, sessionData] = await Promise.all([
        docRes.json(),
        aptRes.json(),
        sessionRes.json(),
      ]);

      if (docData.success) {
        setDoctors(docData.doctors || []);
        if (docData.doctors?.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docData.doctors[0].id);
        }
      }
      if (aptData.success) setMyAppointments(aptData.appointments || []);
      if (sessionData.success) setCurrentUser(sessionData.user);
    } catch (err) {
      console.error('Failed to load appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    setTodayString(now.toISOString().split('T')[0]);
    setSelectedDate(new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    loadData();
  }, []);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  // Calculate which slots are already booked on selectedDate for selectedDoctor
  const bookedSlotsOnDate = myAppointments
    .filter(
      (a) =>
        a.doctorId === selectedDoctorId &&
        a.date === selectedDate &&
        !['cancelled_by_student', 'cancelled_by_doctor'].includes(a.status)
    )
    .map((a) => a.timeSlot);

  const isDoctorBlockedOnDate = selectedDoctor?.blockedDates?.includes(selectedDate);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setBookedSuccess(null);

    if (!selectedDoctorId || !selectedDate || !selectedTimeSlot || !selectedReason) {
      setBookingError('Please select a doctor, date, available time slot, and reason for consultation.');
      return;
    }

    setIsBooking(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          date: selectedDate,
          timeSlot: selectedTimeSlot,
          reasonCategory: selectedReason,
          notes: bookingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setBookedSuccess(data.appointment);
      setSelectedTimeSlot('');
      setBookingNotes('');
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.7 } });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      setBookingError(msg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelAppointment = async (aptId: string) => {
    const reason = prompt('Please enter the reason for cancellation:');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/appointments/${aptId}?reason=${encodeURIComponent(reason || 'Cancelled by student')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Appointment successfully cancelled.');
        await loadData();
      } else {
        alert('Cancellation failed: ' + data.error);
      }
    } catch (err) {
      alert('Cancellation error: ' + err);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingApt || !rescheduleDate || !rescheduleSlot) {
      setRescheduleError('Please select a new date and time slot.');
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
        throw new Error(data.error || 'Reschedule failed');
      }

      alert(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleSlot}!`);
      setReschedulingApt(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reschedule error';
      setRescheduleError(msg);
    } finally {
      setIsRescheduling(false);
    }
  };

  const upcomingAppointments = myAppointments.filter(
    (a) => !['cancelled_by_student', 'cancelled_by_doctor', 'completed'].includes(a.status)
  );
  const pastAppointments = myAppointments.filter(
    (a) => ['cancelled_by_student', 'cancelled_by_doctor', 'completed'].includes(a.status)
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Primary Campus Feature · Health & Wellness</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Campus Doctor Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Schedule consultations with certified campus physicians, counselors, and sports specialists with real-time slot conflict prevention.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'book'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Book New Slot
          </button>
          <button
            onClick={() => setActiveTab('my_appointments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'my_appointments'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>My Bookings</span>
            {upcomingAppointments.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-400 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                {upcomingAppointments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-2xl glass-card border border-blue-900/40 bg-blue-950/20 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white block mb-0.5">Campus Medical Privacy Guarantee</span>
          CivicsPulse strictly restricts appointment data to logistics (Doctor, Date, Time Slot, and Visit Category). No private medical records, prescriptions, or clinical diagnoses are stored in the system.
        </div>
      </div>

      {activeTab === 'book' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Directory Cards (Left Column) */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>1. Choose Specialist</span>
            </h2>

            <div className="space-y-3">
              {doctors.map((doc) => {
                const isSelected = selectedDoctorId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setSelectedTimeSlot('');
                    }}
                    className={`p-4 rounded-2xl cursor-pointer transition border ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
                        : 'glass-card hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                        {doc.avatarUrl ? (
                          <img src={doc.avatarUrl} alt={doc.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-blue-400">
                            {doc.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-white truncate">{doc.fullName}</h3>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-blue-400 font-medium truncate">{doc.specialization}</p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{doc.clinicCabin}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                      <p className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{doc.consultationHours}</span>
                      </p>
                      <p className="line-clamp-2 text-slate-400 text-[10px]">{doc.bio}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Form (Right 2 Columns) */}
          <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>2. Select Schedule & Consultation Details</span>
            </h2>

            {/* Error & Success Alerts */}
            {bookingError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Scheduling Conflict / Error</span>
                  {bookingError}
                </div>
              </div>
            )}

            {bookedSuccess && (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Appointment Confirmed Successfully!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-2 border-t border-emerald-500/20">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Reference Code</span>
                    <span className="font-mono font-bold text-white text-xs">{bookedSuccess.referenceCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Doctor</span>
                    <span className="font-semibold text-white">{bookedSuccess.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Date & Time</span>
                    <span className="font-semibold text-white">
                      {bookedSuccess.date} at {bookedSuccess.timeSlot}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Clinic Location</span>
                    <span className="font-semibold text-white">{bookedSuccess.clinicCabin}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-6">
              {/* Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Consultation Date
                </label>
                <input
                  type="date"
                  min={todayString}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTimeSlot('');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  required
                />
                {isDoctorBlockedOnDate && (
                  <p className="text-xs text-rose-400 font-semibold mt-1 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Doctor is on leave or unavailable on this selected date. Please pick another date.</span>
                  </p>
                )}
              </div>

              {/* Time Slots Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Available Consultation Slots ({selectedDate})
                </label>
                {isDoctorBlockedOnDate ? (
                  <p className="text-xs text-slate-500 italic">No slots available on doctor leave date.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookedSlotsOnDate.includes(slot);
                      const isSelected = selectedTimeSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                            isBooked
                              ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {slot}
                          {isBooked && <span className="block text-[9px] text-rose-400/80 font-normal">Reserved</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Reason for Visit
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  required
                >
                  {REASON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Logistics Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Need signature on sports trial form; recurring fever for 2 days..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBooking || isDoctorBlockedOnDate || !selectedTimeSlot}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition flex items-center justify-center space-x-2"
              >
                {isBooking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Slot Concurrency...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Lock Appointment Slot</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* My Appointments Tab */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Upcoming & Scheduled Visits</span>
            </h2>
            <span className="text-xs text-slate-400">{upcomingAppointments.length} Active</span>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
              <Stethoscope className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-sm text-slate-300">No active doctor appointments.</p>
              <p className="text-xs text-slate-500 mt-1">Book a slot above with any of our campus health specialists.</p>
              <button
                onClick={() => setActiveTab('book')}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                Schedule Appointment Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="glass-card p-5 rounded-2xl border border-slate-700 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                        {apt.referenceCode}
                      </span>
                      <h3 className="font-bold text-base text-white mt-1.5">{apt.doctorName}</h3>
                      <p className="text-xs text-blue-400">{apt.doctorSpecialization}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                      {apt.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <p className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{apt.date}</span>
                    </p>
                    <p className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{apt.timeSlot}</span>
                    </p>
                    <p className="col-span-2 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{apt.clinicCabin}</span>
                    </p>
                    <p className="col-span-2 text-slate-400 text-[11px]">
                      Reason: <span className="text-slate-200">{apt.reasonCategory}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setReschedulingApt(apt);
                        setRescheduleDate(apt.date);
                        setRescheduleSlot('');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past History */}
          {pastAppointments.length > 0 && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-400">Past & Cancelled Consultations</h3>
              <div className="divide-y divide-slate-800/80 glass-card rounded-2xl overflow-hidden">
                {pastAppointments.map((apt) => (
                  <div key={apt.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500">{apt.referenceCode}</span>
                        <span className="font-semibold text-slate-300">{apt.doctorName}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {apt.date} at {apt.timeSlot} · {apt.reasonCategory}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        apt.status === 'completed'
                          ? 'bg-slate-800 text-emerald-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {apt.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-white">
              Reschedule: {reschedulingApt.doctorName}
            </h3>
            <p className="text-xs text-slate-400">
              Current Slot: {reschedulingApt.date} at {reschedulingApt.timeSlot}
            </p>

            {rescheduleError && (
              <p className="text-xs text-rose-400 font-semibold">{rescheduleError}</p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Date</label>
              <input
                type="date"
                min={todayString}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setRescheduleSlot(slot)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      rescheduleSlot === slot
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReschedulingApt(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={isRescheduling || !rescheduleSlot}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-md disabled:bg-slate-800"
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
