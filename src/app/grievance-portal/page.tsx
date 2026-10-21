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
      <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
          <Lock className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-black text-black">Confidential Grievance Directorate</h2>
        <p className="text-xs text-rose-600 font-black">{unauthorizedMessage}</p>
        <p className="text-xs font-bold text-neutral-700 leading-relaxed">
          This portal enforces strict privilege separation. Facilities staff and clinic doctors have 0 access to ethics and harassment cases.
          To evaluate, switch to <strong>Prof. Madhavan Nair (Grievance Officer)</strong> or a <strong>Student</strong> persona.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#C084FC] border-[3.5px] border-black shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase tracking-wider mb-3">
            <Scale className="w-4 h-4 text-black" />
            <span>Restricted Ethics & Proctorial Governance</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Confidential Grievance Directorate
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 max-w-xl">
            Sealed investigation workflow for staff-behaviour grievances, harassment, and ethical misconduct.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5 self-start md:self-auto"
        >
          <PlusCircle className="w-5 h-5 text-black" />
          <span>Lodge Confidential Grievance</span>
        </button>
      </div>

      {/* Confidentiality Notice */}
      <div className="p-4 rounded-2xl bg-[#FEF08A] border-2 border-black shadow-[3px_3px_0px_#000] flex items-start space-x-3">
        <Lock className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-900">
          <span className="font-black text-black block mb-0.5 text-sm">Sealed Institutional Safeguard</span>
          Unlike general campus infrastructure complaints, files here are strictly confidential and inaccessible to department facilities staff and clinic doctors. Only the Internal Complaints Committee (ICC) and Student Affairs Dean can view records.
        </div>
      </div>

      {/* Grievance Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-black">
            {isOfficerOrAdmin ? 'ICC Grievance Case Docket' : 'My Filed Grievances'} ({grievances.length})
          </h2>
          <span className="text-xs font-black text-neutral-800 bg-white px-3 py-1 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
            {isOfficerOrAdmin ? 'Full Committee Access' : 'Private Student View'}
          </span>
        </div>

        {grievances.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-black border-[3px] border-black shadow-[5px_5px_0px_#000] space-y-2">
            <CheckCircle2 className="w-12 h-12 text-black mx-auto mb-2" />
            <p className="text-base font-black text-black">No active grievances pending.</p>
            <p className="text-xs font-bold text-neutral-600">Sealed case files will appear here when submitted.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grievances.map((item) => (
              <div
                key={item.id}
                className="bg-white p-6 rounded-3xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-[#C084FC] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                      {item.referenceCode}
                    </span>
                    <span className="text-xs font-bold text-neutral-800">
                      Incident Date: <strong className="text-black underline">{item.incidentDate}</strong>
                    </span>
                  </div>

                  <span
                    className={`text-xs px-3 py-0.5 rounded-full font-black uppercase border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                      item.status === 'hearing_scheduled'
                        ? 'bg-[#FFE600] text-black'
                        : item.status === 'resolved'
                        ? 'bg-[#A3E635] text-black'
                        : 'bg-[#38BDF8] text-black'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-black">{item.subject}</h3>
                  <p className="text-xs text-neutral-800 font-bold mt-1">
                    Target Staff / Unit: <span className="bg-[#FAF7EE] px-2 py-0.5 rounded border border-black">{item.targetDepartmentOrRole}</span>
                  </p>
                  <p className="text-xs font-medium text-neutral-800 mt-2 leading-relaxed bg-[#FAF7EE] p-3 rounded-xl border border-black">
                    {item.incidentDescription}
                  </p>
                </div>

                {/* Hearing Notes & Proceedings */}
                {item.hearingNotes && (
                  <div className="p-4 rounded-2xl bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] text-xs space-y-1 text-black">
                    <span className="font-black text-black block">ICC Inquiry & Hearing Proceedings:</span>
                    <p className="font-medium text-neutral-900 text-[11px] leading-relaxed">{item.hearingNotes}</p>
                    {item.hearingScheduledDate && (
                      <p className="text-black font-black text-[11px] pt-1 underline">
                        Formal Hearing Date: {new Date(item.hearingScheduledDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black text-xs text-neutral-700">
                  <div className="flex items-center space-x-2 font-bold">
                    {item.isAnonymous ? (
                      <span className="flex items-center space-x-1 text-neutral-800 bg-[#FAF7EE] px-2.5 py-1 rounded border border-black">
                        <EyeOff className="w-3.5 h-3.5 text-black" />
                        <span>Sealed Identity (Anonymous)</span>
                      </span>
                    ) : (
                      <span>Filed by: <strong className="text-black">{item.studentName}</strong></span>
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
                      className="px-3.5 py-2 rounded-xl bg-[#C084FC] hover:bg-purple-300 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[10px_10px_0px_#000] space-y-4 my-8 text-black">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div>
                <h3 className="font-black text-lg text-black">Lodge Confidential Grievance</h3>
                <p className="text-xs font-bold text-neutral-600">Directly routed to the Internal Grievance Directorate</p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-black bg-white hover:bg-[#FB7185] border-2 border-black p-1.5 rounded-lg font-black shadow-[1.5px_1.5px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGrievance} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black mb-1">
                  Target Staff Member, Security Guard, or Department
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hostel Gate 4 Night Security Staff, Lab Assistant Room 204..."
                  value={targetDepartmentOrRole}
                  onChange={(e) => setTargetDepartmentOrRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Subject / Nature of Incident</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abusive Language and ID Confiscation at Gate Entry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Date of Incident</label>
                <input
                  type="date"
                  max={todayString}
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Detailed Confidential Statement</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please state facts, approximate time, location, and witnesses..."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="grvAnon"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 border-2 border-black rounded"
                />
                <label htmlFor="grvAnon" className="text-xs font-bold text-neutral-800">
                  Seal Identity (Protect identity from named staff members)
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !subject || !incidentDescription}
                  className="flex-1 py-2.5 rounded-xl bg-[#C084FC] hover:bg-purple-300 text-xs font-black text-black border-2 border-black shadow-[3px_3px_0px_#000] disabled:bg-neutral-200 transition active:translate-x-0.5 active:translate-y-0.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[10px_10px_0px_#000] space-y-4 my-8 text-black">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div>
                <h3 className="font-black text-lg text-black">Adjudicate Grievance Case</h3>
                <p className="text-xs font-mono font-bold text-neutral-700">File: {adjudicatingGrievance.referenceCode}</p>
              </div>
              <button
                onClick={() => setAdjudicatingGrievance(null)}
                className="text-black bg-white hover:bg-[#FB7185] border-2 border-black p-1.5 rounded-lg font-black shadow-[1.5px_1.5px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjudication} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black mb-1">Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as GrievanceStatus)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] outline-none"
                >
                  <option value="confidential_review">Confidential Review</option>
                  <option value="hearing_scheduled">Hearing Scheduled</option>
                  <option value="investigation_active">Investigation Active</option>
                  <option value="resolved">Resolved with Action</option>
                  <option value="dismissed">Dismissed (No Grounds)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">
                  Hearing Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={hearingDateInput}
                  onChange={(e) => setHearingDateInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">
                  In-Camera Inquiry & Hearing Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record summary of evidence, CCTV review, witness statements, or security briefing..."
                  value={hearingNotesInput}
                  onChange={(e) => setHearingNotesInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setAdjudicatingGrievance(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjudication}
                  className="flex-1 py-2.5 rounded-xl bg-[#C084FC] hover:bg-purple-300 text-xs font-black text-black border-2 border-black shadow-[3px_3px_0px_#000] disabled:bg-neutral-200 transition active:translate-x-0.5 active:translate-y-0.5"
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
