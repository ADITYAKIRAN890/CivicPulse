'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Clock,
  EyeOff,
  UserCheck,
  Scale,
  PlusCircle,
} from 'lucide-react';
import { Grievance, GrievanceStatus, UserProfile } from '@/types';

export default function GrievancePortalPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState<string | null>(null);

  // New Grievance Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [targetDepartmentOrRole, setTargetDepartmentOrRole] = useState('');
  const [subject, setSubject] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [todayString, setTodayString] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjudication Modal for Grievance Officer
  const [adjudicatingGrievance, setAdjudicatingGrievance] = useState<Grievance | null>(null);
  const [statusInput, setStatusInput] = useState<GrievanceStatus>('hearing_scheduled');
  const [hearingDateInput, setHearingDateInput] = useState('');
  const [hearingNotesInput, setHearingNotesInput] = useState('');
  const [resolutionSummaryInput, setResolutionSummaryInput] = useState('');
  const [isSavingAdjudication, setIsSavingAdjudication] = useState(false);

  const loadData = async () => {
    try {
      const [grvRes, sessionRes] = await Promise.all([
        fetch('/api/grievances'),
        fetch('/api/auth/session'),
      ]);
      const [grvData, sessionData] = await Promise.all([grvRes.json(), sessionRes.json()]);

      if (sessionData.success) setCurrentUser(sessionData.user);

      if (!grvRes.ok || !grvData.success) {
        setUnauthorizedMessage(grvData.error || 'Access to confidential grievance archives is restricted.');
      } else {
        setGrievances(grvData.grievances || []);
        setUnauthorizedMessage(null);
      }
    } catch (err) {
      console.error('Failed to load grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayString(today);
    setIncidentDate(today);
    loadData();
  }, []);

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDepartmentOrRole,
          subject,
          incidentDescription,
          incidentDate,
          isAnonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit grievance');
      }

      alert(`Confidential Grievance ${data.grievance.referenceCode} sealed and lodged with the Proctorial Directorate.`);
      setShowSubmitModal(false);
      setSubject('');
      setTargetDepartmentOrRole('');
      setIncidentDescription('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error lodging grievance';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAdjudication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjudicatingGrievance) return;

    setIsSavingAdjudication(true);
    try {
      const res = await fetch(`/api/grievances/${adjudicatingGrievance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusInput,
          hearingScheduledDate: hearingDateInput || undefined,
          hearingNotes: hearingNotesInput || undefined,
          confidentialResolutionSummary: resolutionSummaryInput || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update grievance');
      }

      alert('Grievance record updated with hearing proceedings.');
      setAdjudicatingGrievance(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating grievance';
      alert(msg);
    } finally {
      setIsSavingAdjudication(false);
    }
  };

  const isOfficerOrAdmin =
    currentUser?.role === 'grievance_officer' || currentUser?.role === 'administrator';

  if (!loading && unauthorizedMessage) {
    return (
      <div className="p-12 glass-card rounded-3xl text-center space-y-4 max-w-lg mx-auto">
        <Lock className="w-12 h-12 text-purple-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Confidential Grievance Directorate</h2>
        <p className="text-xs text-rose-400 font-semibold">{unauthorizedMessage}</p>
        <p className="text-xs text-slate-400">
          This portal enforces strict privilege separation. Facilities staff and clinic doctors have 0 access to ethics and harassment cases.
          To evaluate, switch to <strong>Prof. Madhavan Nair (Grievance Officer)</strong> or a <strong>Student</strong> persona.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            <span>Restricted Ethics & Proctorial Governance</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Confidential Grievance Directorate
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sealed investigation workflow for staff-behaviour grievances, harassment, and ethical misconduct.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-600/20 transition self-start md:self-auto"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Lodge Confidential Grievance</span>
        </button>
      </div>

      {/* Confidentiality Notice */}
      <div className="p-4 rounded-2xl glass-card border border-purple-900/40 bg-purple-950/20 flex items-start space-x-3">
        <Lock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-bold text-white block mb-0.5">Sealed Institutional Safeguard</span>
          Unlike general campus infrastructure complaints, files here are strictly confidential and inaccessible to department facilities staff and clinic doctors. Only the Internal Complaints Committee (ICC) and Student Affairs Dean can view records.
        </div>
      </div>

      {/* Grievance Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {isOfficerOrAdmin ? 'ICC Grievance Case Docket' : 'My Filed Grievances'} ({grievances.length})
          </h2>
          <span className="text-xs text-slate-400">
            {isOfficerOrAdmin ? 'Full Committee Access' : 'Private Student View'}
          </span>
        </div>

        {grievances.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No active grievances pending.</p>
            <p className="text-xs text-slate-500 mt-1">Sealed case files will appear here when submitted.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grievances.map((item) => (
              <div
                key={item.id}
                className="glass-card p-6 rounded-3xl border border-purple-900/40 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {item.referenceCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      Incident Date: <strong className="text-slate-300">{item.incidentDate}</strong>
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      item.status === 'hearing_scheduled'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : item.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{item.subject}</h3>
                  <p className="text-xs text-purple-300 font-medium mt-0.5">
                    Target Staff / Unit: {item.targetDepartmentOrRole}
                  </p>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {item.incidentDescription}
                  </p>
                </div>

                {/* Hearing Notes & Proceedings */}
                {item.hearingNotes && (
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                    <span className="font-bold text-purple-300 block">ICC Inquiry & Hearing Proceedings:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{item.hearingNotes}</p>
                    {item.hearingScheduledDate && (
                      <p className="text-amber-400 font-semibold text-[10px] pt-1">
                        Formal Hearing Date: {new Date(item.hearingScheduledDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    {item.isAnonymous ? (
                      <span className="flex items-center space-x-1 text-slate-400">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Sealed Identity (Anonymous)</span>
                      </span>
                    ) : (
                      <span>Filed by: <strong className="text-slate-300">{item.studentName}</strong></span>
                    )}
                  </div>

                  {isOfficerOrAdmin && (
                    <button
                      onClick={() => {
                        setAdjudicatingGrievance(item);
                        setStatusInput(item.status);
                        setHearingDateInput(item.hearingScheduledDate || '');
                        setHearingNotesInput(item.hearingNotes || '');
                        setResolutionSummaryInput(item.confidentialResolutionSummary || '');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                    >
                      Adjudicate & Hearing Notes
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Grievance Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Lodge Confidential Grievance</h3>
                <p className="text-xs text-slate-400">Directly routed to the Internal Grievance Directorate</p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGrievance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Target Staff Member, Security Guard, or Department
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hostel Gate 4 Night Security Staff, Lab Assistant Room 204..."
                  value={targetDepartmentOrRole}
                  onChange={(e) => setTargetDepartmentOrRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subject / Nature of Incident</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abusive Language and ID Confiscation at Gate Entry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Date of Incident</label>
                <input
                  type="date"
                  max={todayString}
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Detailed Confidential Statement</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please state facts, approximate time, location, and witnesses..."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="grvAnon"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                />
                <label htmlFor="grvAnon" className="text-xs text-slate-300">
                  Seal Identity (Protect identity from named staff members)
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !subject || !incidentDescription}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md disabled:bg-slate-800"
                >
                  {isSubmitting ? 'Sealing...' : 'Submit to Directorate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjudication Modal */}
      {adjudicatingGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Adjudicate Grievance Case</h3>
                <p className="text-xs text-slate-400">File: {adjudicatingGrievance.referenceCode}</p>
              </div>
              <button
                onClick={() => setAdjudicatingGrievance(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjudication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as GrievanceStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="confidential_review">Confidential Review</option>
                  <option value="hearing_scheduled">Hearing Scheduled</option>
                  <option value="investigation_active">Investigation Active</option>
                  <option value="resolved">Resolved with Action</option>
                  <option value="dismissed">Dismissed (No Grounds)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Hearing Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={hearingDateInput}
                  onChange={(e) => setHearingDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  In-Camera Inquiry & Hearing Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record summary of evidence, CCTV review, witness statements, or security briefing..."
                  value={hearingNotesInput}
                  onChange={(e) => setHearingNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjudicatingGrievance(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjudication}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md disabled:bg-slate-800"
                >
                  {isSavingAdjudication ? 'Saving Record...' : 'Save Case Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
