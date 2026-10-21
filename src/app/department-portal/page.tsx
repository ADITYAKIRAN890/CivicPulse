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
} from 'lucide-react';
import { Complaint, ComplaintStatus, UserProfile } from '@/types';

export default function DepartmentPortalPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolution Modal State
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImageUrl, setResolutionImageUrl] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  const loadData = async () => {
    try {
      const [cmpRes, sessionRes] = await Promise.all([
        fetch('/api/complaints'),
        fetch('/api/auth/session'),
      ]);
      const [cmpData, sessionData] = await Promise.all([cmpRes.json(), sessionRes.json()]);

      if (cmpData.success) setComplaints(cmpData.complaints || []);
      if (sessionData.success) setCurrentUser(sessionData.user);
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
      <div className="p-12 glass-card rounded-3xl text-center space-y-4 max-w-lg mx-auto">
        <Building2 className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Department Facilities Access Restricted</h2>
        <p className="text-xs text-slate-400">
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
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Facilities Operations & Work Orders Desk</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Facilities Triage & Resolution
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Validate student reports (+25 pts milestone), dispatch repair crews, and attach photographic proof (+50 pts milestone).
          </p>
        </div>

        <div className="p-3 rounded-2xl glass-card border border-cyan-500/30 text-xs">
          <span className="text-slate-400 block text-[10px]">Logged in as Staff:</span>
          <span className="font-bold text-white">{currentUser?.fullName}</span>
          <span className="text-cyan-400 block text-[11px]">{currentUser?.department || 'Facilities Ops'}</span>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Active Campus Work Orders ({activeTickets.length})</h2>
          <span className="text-xs text-slate-400">Sorted by Priority Score</span>
        </div>

        <div className="space-y-4">
          {activeTickets.map((item) => (
            <div
              key={item.id}
              className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                    {item.referenceCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      item.priority === 'critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : item.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {item.priority} priority ({item.priorityScore}/100)
                  </span>
                  <span className="text-xs text-slate-400">
                    Zone: <strong className="text-slate-300">{item.campusZone}</strong>
                  </span>
                </div>

                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    item.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : item.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.locationDetails}</span>
                </p>
              </div>

              {/* Action Buttons for Facilities Staff */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  Reported by: <span className="text-white">{item.studentName}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {item.status === 'submitted' && (
                    <button
                      onClick={() => handleTriage(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition"
                    >
                      Triage & Validate (+25 pts to student)
                    </button>
                  )}

                  {['submitted', 'triaged'].includes(item.status) && (
                    <button
                      onClick={() => handleSetInProgress(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition"
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
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition"
                    >
                      Resolve with Proof (+50 pts)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Proof Submission Modal */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Submit Resolution Evidence</h3>
                <p className="text-xs text-slate-400">Ticket: {resolvingComplaint.referenceCode}</p>
              </div>
              <button
                onClick={() => setResolvingComplaint(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Resolution Work Done Details
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Replaced faulty circuit breaker, sanitized filter, re-crimped loose CAT6 cable..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Resolution Photographic Evidence URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or campus storage URL"
                  value={resolutionImageUrl}
                  onChange={(e) => setResolutionImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Photo proof will be visible on the public ticket for student verification.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution || !resolutionNotes}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md disabled:bg-slate-800"
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
