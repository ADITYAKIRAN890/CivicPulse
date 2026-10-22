'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  UserCheck,
  ShieldCheck,
  MapPin,
  FileCheck,
  Sparkles,
  ArrowRight,
  Mail,
} from 'lucide-react';
import { Complaint, ComplaintStatus, UserProfile, ComplaintEmailNotification } from '@/types';

export default function DepartmentPortalPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<ComplaintEmailNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolution Modal State
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImageUrl, setResolutionImageUrl] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  const loadData = async () => {
    try {
      const [cmpRes, sessionRes, emailNotifRes] = await Promise.all([
        fetch('/api/complaints'),
        fetch('/api/auth/session'),
        fetch('/api/email/notifications'),
      ]);
      const [cmpData, sessionData, emailNotifData] = await Promise.all([
        cmpRes.json(),
        sessionRes.json(),
        emailNotifRes.json(),
      ]);

      if (cmpData.success) setComplaints(cmpData.complaints || []);
      if (sessionData.success) setCurrentUser(sessionData.user);
      if (emailNotifData.success) setEmailNotifications(emailNotifData.notifications || []);
    } catch (err) {
      console.error('Failed to load department portal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriage = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'triaged',
          notes: 'Validated and accepted by facilities staff. Work ticket scheduled.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Complaint triaged! +${data.pointsAwarded} points credited to student.`);
        await loadData();
      } else {
        alert('Triage failed: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err);
    }
  };

  const handleSetInProgress = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          notes: 'Maintenance crew deployed on site.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Status moved to In Progress.');
        await loadData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err);
    }
  };

  const handleCompleteResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint || !resolutionNotes) return;

    setIsSubmittingResolution(true);
    try {
      const res = await fetch(`/api/complaints/${resolvingComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          notes: resolutionNotes,
          resolutionImageUrl: resolutionImageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Issue marked Resolved with proof! +${data.pointsAwarded} milestone points awarded to student.`);
        setResolvingComplaint(null);
        setResolutionNotes('');
        setResolutionImageUrl('');
        await loadData();
      } else {
        alert('Resolution failed: ' + data.error);
      }
    } catch (err) {
      alert('Error submitting resolution: ' + err);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const isStaffOrAdmin =
    currentUser?.role === 'department_staff' || currentUser?.role === 'administrator';

  if (!loading && !isStaffOrAdmin) {
    return (
      <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
          <Building2 className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-black text-black">Department Facilities Access Restricted</h2>
        <p className="text-xs font-bold text-neutral-700 leading-relaxed">
          You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
          To evaluate this department staff workflow, switch to <strong>Rajesh Kumar (Dept Staff)</strong> using the top Persona Switcher.
        </p>
      </div>
    );
  }

  const activeTickets = complaints.filter(
    (c) => !['verified_by_student'].includes(c.status)
  );

  return (
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#FB923C] border-[3.5px] border-black shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase tracking-wider mb-3">
            <Building2 className="w-4 h-4 text-black" />
            <span>Facilities Operations & Work Orders Desk</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Facilities Triage & Resolution
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 max-w-xl">
            Validate student reports (+25 pts milestone), dispatch repair crews, and attach photographic proof (+50 pts milestone).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_#000] text-xs">
          <span className="text-neutral-600 block text-[10px] font-bold">Logged in as Staff:</span>
          <span className="font-black text-base text-black block">{currentUser?.fullName}</span>
          <span className="font-mono font-black text-black bg-[#FFE600] px-2 py-0.5 rounded border border-black inline-block mt-1 text-[11px]">
            {currentUser?.department || 'Facilities Ops'}
          </span>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-black">Active Campus Work Orders ({activeTickets.length})</h2>
          <span className="text-xs font-black text-neutral-700 bg-white px-3 py-1 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
            Sorted by Priority Score
          </span>
        </div>

        <div className="space-y-4">
          {activeTickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-black border-[3px] border-black shadow-[5px_5px_0px_#000] space-y-2">
              <CheckCircle2 className="w-12 h-12 text-black mx-auto mb-2" />
              <p className="text-base font-black text-black">No active work orders pending!</p>
              <p className="text-xs font-bold text-neutral-600">All student reports have been verified and closed.</p>
            </div>
          ) : (
            activeTickets.map((item) => (
              <div
                key={item.id}
                className="bg-white p-6 rounded-3xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-[#FFE600] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                      {item.referenceCode}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                        item.priority === 'critical'
                          ? 'bg-[#FB7185] text-black'
                          : item.priority === 'high'
                          ? 'bg-[#FB923C] text-black'
                          : 'bg-[#38BDF8] text-black'
                      }`}
                    >
                      {item.priority} priority ({item.priorityScore}/100)
                    </span>
                    <span className="text-xs font-bold text-neutral-800">
                      Zone: <strong className="text-black underline">{item.campusZone}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {(() => {
                      const notif = emailNotifications.find((n) => n.complaintId === item.id);
                      if (!notif) return null;
                      return (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black border-2 border-black shadow-[1px_1px_0px_#000] flex items-center space-x-1 ${
                            notif.status === 'queued'
                              ? 'bg-[#38BDF8] text-black'
                              : notif.status === 'sent' || notif.status === 'delivered'
                              ? 'bg-[#A3E635] text-black'
                              : 'bg-[#FB7185] text-black'
                          }`}
                          title={notif.resendId ? `Resend ID: ${notif.resendId}` : notif.errorMessage}
                        >
                          <Mail className="w-3 h-3 text-black" />
                          <span className="capitalize">Email: {notif.status}</span>
                        </span>
                      );
                    })()}

                    <span
                      className={`text-xs px-3 py-1 rounded-full font-black uppercase border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                        item.status === 'resolved'
                          ? 'bg-[#A3E635] text-black'
                          : item.status === 'in_progress'
                          ? 'bg-[#38BDF8] text-black'
                          : 'bg-[#FEF08A] text-black'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-black">{item.title}</h3>
                  <p className="text-xs font-semibold text-neutral-800 mt-1">{item.description}</p>
                  <p className="text-[11px] font-bold text-neutral-600 mt-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-black" />
                    <span>{item.locationDetails}</span>
                  </p>
                </div>

                {/* Action Buttons for Facilities Staff */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black">
                  <div className="text-xs font-bold text-neutral-700">
                    Reported by: <span className="font-black text-black">{item.studentName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.status === 'submitted' && (
                      <button
                        onClick={() => handleTriage(item.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                      >
                        Triage & Validate (+25 pts)
                      </button>
                    )}

                    {['submitted', 'triaged'].includes(item.status) && (
                      <button
                        onClick={() => handleSetInProgress(item.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#38BDF8] hover:bg-sky-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                      >
                        Dispatch Crew (In Progress)
                      </button>
                    )}

                    {item.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          setResolvingComplaint(item);
                          setResolutionNotes('');
                          setResolutionImageUrl('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                      >
                        Resolve with Proof (+50 pts)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolution Proof Submission Modal */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[10px_10px_0px_#000] space-y-4 text-black">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div>
                <h3 className="font-black text-lg text-black">Submit Resolution Evidence</h3>
                <p className="text-xs font-mono font-bold text-neutral-700">Ticket: {resolvingComplaint.referenceCode}</p>
              </div>
              <button
                onClick={() => setResolvingComplaint(null)}
                className="text-black bg-white hover:bg-[#FB7185] border-2 border-black p-1.5 rounded-lg font-black shadow-[1.5px_1.5px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black mb-1">
                  Resolution Work Done Details
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Replaced faulty circuit breaker, sanitized filter, re-crimped loose CAT6 cable..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">
                  Resolution Photographic Evidence URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or campus storage URL"
                  value={resolutionImageUrl}
                  onChange={(e) => setResolutionImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
                <p className="text-[11px] font-bold text-neutral-600 mt-1">
                  Photo proof will be visible on the public ticket for student verification.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution || !resolutionNotes}
                  className="flex-1 py-2.5 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-xs font-black text-black border-2 border-black shadow-[3px_3px_0px_#000] disabled:bg-neutral-200 transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  {isSubmittingResolution ? 'Saving...' : 'Certify Resolved & Award +50 pts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
