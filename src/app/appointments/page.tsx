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
    <div className="space-y-8 pb-12 text-black">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#38BDF8] border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center space-x-2 bg-black text-white px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000] mb-2">
            <Stethoscope className="w-4 h-4 text-[#38BDF8]" />
            <span>Primary Campus Feature · Health & Wellness</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Campus Doctor Appointments
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-neutral-800 mt-1">
            Schedule consultations with certified campus physicians, counselors, and sports specialists with real-time slot conflict prevention.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] shrink-0">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition border-2 ${
              activeTab === 'book'
                ? 'bg-[#FFE600] border-black text-black shadow-[2px_2px_0px_#000]'
                : 'border-transparent text-black hover:bg-neutral-100'
            }`}
          >
            Book New Slot
          </button>
          <button
            onClick={() => setActiveTab('my_appointments')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center space-x-1.5 border-2 ${
              activeTab === 'my_appointments'
                ? 'bg-[#FFE600] border-black text-black shadow-[2px_2px_0px_#000]'
                : 'border-transparent text-black hover:bg-neutral-100'
            }`}
          >
            <span>My Bookings</span>
            {upcomingAppointments.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center">
                {upcomingAppointments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[3.5px_3.5px_0px_#000] flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="text-xs text-black font-semibold leading-relaxed">
          <span className="font-black text-black block mb-0.5">Campus Medical Privacy Guarantee</span>
          Civic Pulse strictly restricts appointment data to logistics (Doctor, Date, Time Slot, and Visit Category). No private medical records, prescriptions, or clinical diagnoses are stored in the system.
        </div>
      </div>

      {activeTab === 'book' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Directory Cards (Left Column) */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-base font-black text-black flex items-center space-x-2">
              <User className="w-4 h-4 text-black" />
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
                    className={`p-4 rounded-xl cursor-pointer transition border-[2.5px] border-black shadow-[3.5px_3.5px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] ${
                      isSelected
                        ? 'bg-[#FFE600]'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                        {doc.avatarUrl ? (
                          <img src={doc.avatarUrl} alt={doc.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-black text-lg">
                            {doc.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-sm text-black truncate">{doc.fullName}</h3>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-black shrink-0" />}
                        </div>
                        <p className="text-xs font-bold text-neutral-800 truncate">{doc.specialization}</p>
                        <p className="text-[11px] font-semibold text-neutral-700 mt-1 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-black shrink-0" />
                          <span className="truncate">{doc.clinicCabin}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t-2 border-black/20 text-[11px] text-neutral-800 space-y-1">
                      <p className="flex items-center space-x-1 font-bold">
                        <Clock className="w-3 h-3 text-black" />
                        <span>{doc.consultationHours}</span>
                      </p>
                      <p className="line-clamp-2 text-neutral-700 font-medium text-[10px]">{doc.bio}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Form (Right 2 Columns) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_#000] space-y-6">
            <h2 className="text-base font-black text-black flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-black" />
              <span>2. Select Schedule & Consultation Details</span>
            </h2>

            {/* Error & Success Alerts */}
            {bookingError && (
              <div className="p-4 rounded-xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] text-black text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block">Scheduling Conflict / Error</span>
                  <span className="font-bold">{bookingError}</span>
                </div>
              </div>
            )}

            {bookedSuccess && (
              <div className="p-5 rounded-2xl bg-[#A3E635] border-2 border-black shadow-[4px_4px_0px_#000] text-black text-xs space-y-2">
                <div className="flex items-center space-x-2 font-black text-sm text-black">
                  <CheckCircle2 className="w-5 h-5 text-black" />
                  <span>Appointment Confirmed Successfully!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-black pt-2 border-t-2 border-black font-semibold">
                  <div>
                    <span className="text-neutral-800 block text-[10px]">Reference Code</span>
                    <span className="font-mono font-black text-black text-xs">{bookedSuccess.referenceCode}</span>
                  </div>
                  <div>
                    <span className="text-neutral-800 block text-[10px]">Doctor</span>
                    <span className="font-bold text-black">{bookedSuccess.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-800 block text-[10px]">Date & Time</span>
                    <span className="font-bold text-black">
                      {bookedSuccess.date} at {bookedSuccess.timeSlot}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-800 block text-[10px]">Clinic Location</span>
                    <span className="font-bold text-black">{bookedSuccess.clinicCabin}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-6">
              {/* Date Picker */}
              <div>
                <label className="block text-xs font-black text-black mb-2">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black font-bold text-sm shadow-[3px_3px_0px_#000] focus:shadow-[5px_5px_0px_#000] outline-none transition"
                  required
                />
                {isDoctorBlockedOnDate && (
                  <p className="text-xs text-black font-black mt-1.5 flex items-center space-x-1 bg-[#FB7185] p-2 rounded border border-black shadow-[2px_2px_0px_#000]">
                    <XCircle className="w-4 h-4" />
                    <span>Doctor is on leave or unavailable on this selected date. Please pick another date.</span>
                  </p>
                )}
              </div>

              {/* Time Slots Grid */}
              <div>
                <label className="block text-xs font-black text-black mb-2">
                  Available Consultation Slots ({selectedDate})
                </label>
                {isDoctorBlockedOnDate ? (
                  <p className="text-xs text-neutral-600 font-bold italic">No slots available on doctor leave date.</p>
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
                          className={`py-2 px-3 rounded-lg text-xs font-black transition border-2 border-black shadow-[2.5px_2.5px_0px_#000] ${
                            isBooked
                              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-[#FFE600] text-black shadow-[4px_4px_0px_#000]'
                              : 'bg-white text-black hover:bg-[#FAF7EE]'
                          }`}
                        >
                          {slot}
                          {isBooked && <span className="block text-[9px] text-neutral-600 font-bold">Reserved</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason Category */}
              <div>
                <label className="block text-xs font-black text-black mb-2">
                  Reason for Visit
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black font-bold text-sm shadow-[3px_3px_0px_#000] focus:shadow-[5px_5px_0px_#000] outline-none transition"
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
                <label className="block text-xs font-black text-black mb-2">
                  Logistics Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Need signature on sports trial form; recurring fever for 2 days..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black font-semibold text-sm shadow-[3px_3px_0px_#000] focus:shadow-[5px_5px_0px_#000] outline-none transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBooking || isDoctorBlockedOnDate || !selectedTimeSlot}
                className="w-full py-3.5 rounded-xl bg-[#FFE600] hover:bg-[#FFF066] disabled:bg-neutral-200 disabled:text-neutral-500 text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition flex items-center justify-center space-x-2"
              >
                {isBooking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Verifying Slot Concurrency...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-black" />
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
            <h2 className="text-base font-black text-black flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-black" />
              <span>Upcoming & Scheduled Visits</span>
            </h2>
            <span className="text-xs font-black px-2.5 py-0.5 rounded bg-black text-white border border-black shadow-[1.5px_1.5px_0px_#000]">
              {upcomingAppointments.length} Active
            </span>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-black border-[3px] border-black shadow-[5px_5px_0px_#000]">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 text-black" />
              <p className="font-black text-base text-black">No active doctor appointments.</p>
              <p className="text-xs font-semibold text-neutral-700 mt-1">Book a slot above with any of our campus health specialists.</p>
              <button
                onClick={() => setActiveTab('book')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-yellow-300 transition"
              >
                Schedule Appointment Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="bg-white p-5 rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black text-white font-black border border-black shadow-[1.5px_1.5px_0px_#000]">
                        {apt.referenceCode}
                      </span>
                      <h3 className="font-black text-base text-black mt-2">{apt.doctorName}</h3>
                      <p className="text-xs font-bold text-neutral-800">{apt.doctorSpecialization}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-md bg-[#A3E635] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] font-black uppercase tracking-wider">
                      {apt.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-black pt-2 border-t-2 border-black font-semibold">
                    <p className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-black" />
                      <span>{apt.date}</span>
                    </p>
                    <p className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-black" />
                      <span>{apt.timeSlot}</span>
                    </p>
                    <p className="col-span-2 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-black" />
                      <span>{apt.clinicCabin}</span>
                    </p>
                    <p className="col-span-2 text-neutral-700 text-[11px]">
                      Reason: <span className="font-bold text-black">{apt.reasonCategory}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t-2 border-black">
                    <button
                      onClick={() => {
                        setReschedulingApt(apt);
                        setRescheduleDate(apt.date);
                        setRescheduleSlot('');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#38BDF8] hover:bg-[#7DD3FC] text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="py-1.5 px-3 rounded-lg bg-[#FB7185] hover:bg-rose-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition"
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
            <div className="pt-6 border-t-2 border-black space-y-3">
              <h3 className="text-sm font-black text-black">Past & Cancelled Consultations</h3>
              <div className="divide-y-2 divide-neutral-200 bg-white border-2 border-black shadow-[4px_4px_0px_#000] rounded-2xl overflow-hidden">
                {pastAppointments.map((apt) => (
                  <div key={apt.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-black">{apt.referenceCode}</span>
                        <span className="font-black text-black">{apt.doctorName}</span>
                      </div>
                      <p className="text-neutral-700 font-semibold mt-0.5">
                        {apt.date} at {apt.timeSlot} · {apt.reasonCategory}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black border border-black shadow-[1px_1px_0px_#000] ${
                        apt.status === 'completed'
                          ? 'bg-[#A3E635] text-black'
                          : 'bg-neutral-200 text-neutral-800'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-4">
            <h3 className="font-black text-lg text-black">
              Reschedule: {reschedulingApt.doctorName}
            </h3>
            <p className="text-xs font-semibold text-neutral-700">
              Current Slot: {reschedulingApt.date} at {reschedulingApt.timeSlot}
            </p>

            {rescheduleError && (
              <p className="text-xs font-black text-black bg-[#FB7185] p-2 rounded border border-black">{rescheduleError}</p>
            )}

            <div>
              <label className="block text-xs font-black text-black mb-1">New Date</label>
              <input
                type="date"
                min={todayString}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-black font-bold text-xs shadow-[2px_2px_0px_#000]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1">New Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setRescheduleSlot(slot)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] ${
                      rescheduleSlot === slot
                        ? 'bg-[#FFE600] text-black'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t-2 border-black">
              <button
                onClick={() => setReschedulingApt(null)}
                className="flex-1 py-2 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
              >
                Close
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={isRescheduling || !rescheduleSlot}
                className="flex-1 py-2 rounded-xl bg-[#FFE600] text-xs font-black text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-yellow-300 disabled:bg-neutral-200"
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

