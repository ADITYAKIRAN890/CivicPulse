'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  Filter,
  RefreshCw,
  Search,
  MessageSquare,
  FileCheck,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Complaint, ComplaintCategory, ComplaintStatus, ComplaintAuditLog, DuplicateSuggestion, AIPriorityAnalysis, UserProfile } from '@/types';

const CATEGORIES: { id: ComplaintCategory; label: string }[] = [
  { id: 'hostel', label: 'Hostel Maintenance' },
  { id: 'electricity', label: 'Electrical & Power' },
  { id: 'wifi', label: 'Wi-Fi & Network' },
  { id: 'hygiene', label: 'Hygiene & Housekeeping' },
  { id: 'water', label: 'Water & Plumbing' },
  { id: 'infrastructure', label: 'Civil Infrastructure' },
  { id: 'lab_equipment', label: 'Lab Equipment' },
  { id: 'cafeteria', label: 'Cafeteria & Food' },
  { id: 'classroom_av', label: 'Classroom AV & Projectors' },
  { id: 'security', label: 'Security & Access' },
];

const CAMPUS_ZONES = [
  'Hostel Block A (Boys)',
  'Hostel Block B (Boys)',
  'Hostel Block C (Boys)',
  'Hostel Block D (Girls)',
  'Hostel Block E (Girls)',
  'Central Library',
  'Academic Block 1 (Lecture Halls)',
  'Academic Block 2 (Lecture Halls)',
  'Science & Research Complex (Labs)',
  'Main Cafeteria & Food Court',
  'Campus Sports Complex & Gym',
  'Administration & Dean Wing',
];

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Submit Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('electricity');
  const [campusZone, setCampusZone] = useState<string>(CAMPUS_ZONES[0]);
  const [locationDetails, setLocationDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Local AI State
  const [aiAnalysis, setAiAnalysis] = useState<AIPriorityAnalysis | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateSuggestion[]>([]);

  // Audit Logs Modal State
  const [inspectComplaint, setInspectComplaint] = useState<Complaint | null>(null);
  const [auditLogs, setAuditLogs] = useState<ComplaintAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadComplaints = async () => {
    try {
      const [cmpRes, sessionRes] = await Promise.all([
        fetch('/api/complaints'),
        fetch('/api/auth/session'),
      ]);
      const [cmpData, sessionData] = await Promise.all([cmpRes.json(), sessionRes.json()]);

      if (cmpData.success) setComplaints(cmpData.complaints || []);
      if (sessionData.success) setCurrentUser(sessionData.user);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  // Real-time AI Debounced Analysis
  useEffect(() => {
    if (!title && !description) {
      setAiAnalysis(null);
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [simRes, prioRes] = await Promise.all([
          fetch('/api/ai/similarity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, category, campusZone }),
          }),
          fetch('/api/ai/priority', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, category, campusZone }),
          }),
        ]);

        const [simData, prioData] = await Promise.all([simRes.json(), prioRes.json()]);

        if (simData.success) {
          setDuplicateMatches(simData.suggestions || []);
        }
        if (prioData.success) {
          setAiAnalysis(prioData.analysis);
        }
      } catch (err) {
        console.error('AI check failed:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [title, description, category, campusZone]);

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          campusZone,
          locationDetails,
          imageUrl: imageUrl || undefined,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit complaint');
      }

      setShowSubmitModal(false);
      setTitle('');
      setDescription('');
      setLocationDetails('');
      setImageUrl('');
      setIsAnonymous(false);
      setAiAnalysis(null);
      setDuplicateMatches([]);
      alert(`Complaint ${data.complaint.referenceCode} logged! Department assigned: ${data.complaint.assignedDepartment}`);
      await loadComplaints();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/upvote`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setComplaints((prev) =>
          prev.map((c) => (c.id === complaintId ? data.complaint : c))
        );
      }
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  const handleInspectComplaint = async (complaint: Complaint) => {
    setInspectComplaint(complaint);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`);
      const data = await res.json();
      if (data.success && data.auditLogs) {
        setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleVerifyResolution = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'verified_by_student',
          notes: 'Resolution verified satisfactory by reporting student.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Complaint marked verified! Thank you for validating.');
        await loadComplaints();
      } else {
        alert('Action failed: ' + data.error);
      }
    } catch (err) {
      alert('Error verifying: ' + err);
    }
  };

  const handleEscalate = async (complaintId: string) => {
    const reason = prompt('Please describe why this issue requires escalation to Dean:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'escalated',
          notes: `Escalated by student: ${reason}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Complaint escalated directly to Campus Dean & Head of Facilities.');
        await loadComplaints();
      } else {
        alert('Escalation failed: ' + data.error);
      }
    } catch (err) {
      alert('Error escalating: ' + err);
    }
  };

  // Filtered List
  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.campusZone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.referenceCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FB7185] border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center space-x-2 bg-black text-white px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000] mb-2">
            <AlertTriangle className="w-4 h-4 text-[#FB7185]" />
            <span>Civic Incident Tracking & Zero-Cost AI Triage</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Campus Issues & Infrastructure
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-neutral-800 mt-1">
            Report hostel, electrical, Wi-Fi, hygiene and lab breakdowns. Real-time duplicate suggestion and explainable priority scoring.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#FFE600] hover:bg-[#FFF066] text-black font-black text-sm border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition self-start md:self-auto cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 text-black" />
          <span>Report New Campus Issue</span>
        </button>
      </div>

      {/* Staff Behaviour Grievance Link Notice */}
      <div className="p-4 rounded-xl bg-[#C084FC] border-2 border-black shadow-[3.5px_3.5px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-black">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-black shrink-0" />
          <div className="text-xs font-semibold">
            <span className="font-black text-black block">Looking for confidential staff or proctor grievances?</span>
            Staff-behaviour and ethics complaints are handled in a strictly separate, sealed workflow accessible only by the Grievance Officer.
          </div>
        </div>
        <Link
          href="/grievance-portal"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100 transition shrink-0"
        >
          <span>Open Grievance Desk</span>
          <ChevronRight className="w-3.5 h-3.5 text-black" />
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px] bg-[#FAF7EE] border-2 border-black rounded-xl px-3 py-2 shadow-[2px_2px_0px_#000]">
          <Search className="w-4 h-4 text-black shrink-0" />
          <input
            type="text"
            placeholder="Search by code, keyword, or campus zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-black placeholder-neutral-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black shadow-[2px_2px_0px_#000] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="triaged">Triaged (+25 pts)</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved (+50 pts)</option>
            <option value="verified_by_student">Verified</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold text-black shadow-[2px_2px_0px_#000] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-black font-black">Loading campus reports...</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl text-center text-black border-[3px] border-black shadow-[5px_5px_0px_#000]">
            <AlertTriangle className="w-10 h-10 mx-auto text-black mb-2" />
            <p className="text-base font-black text-black">No complaints matching filter criteria.</p>
          </div>
        ) : (
          filteredComplaints.map((item) => {
            const isAuthor = currentUser?.id === item.studentId;
            const hasUpvoted = currentUser ? item.upvotedBy.includes(currentUser.id) : false;

            return (
              <div
                key={item.id}
                className="bg-white p-6 rounded-2xl border-[2.5px] border-black shadow-[5px_5px_0px_#000] space-y-4 hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000] transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-black text-white border border-black shadow-[1.5px_1.5px_0px_#000]">
                      {item.referenceCode}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#FAF7EE] text-black border-2 border-black font-black capitalize shadow-[1.5px_1.5px_0px_#000]">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                        item.priority === 'critical'
                          ? 'bg-[#FB7185] text-black'
                          : item.priority === 'high'
                          ? 'bg-[#FB923C] text-black'
                          : 'bg-[#38BDF8] text-black'
                      }`}
                    >
                      AI Priority: {item.priority} ({item.priorityScore}/100)
                    </span>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-md font-black uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                      item.status === 'resolved'
                        ? 'bg-[#A3E635] text-black'
                        : item.status === 'verified_by_student'
                        ? 'bg-[#38BDF8] text-black'
                        : item.status === 'in_progress'
                        ? 'bg-[#FFE600] text-black'
                        : item.status === 'triaged'
                        ? 'bg-[#C084FC] text-black'
                        : 'bg-neutral-200 text-black'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-black text-black leading-snug">{item.title}</h3>
                  <p className="text-xs font-semibold text-neutral-800 mt-1 leading-relaxed">{item.description}</p>
                </div>

                {/* Explainable AI Factors */}
                {item.priorityReasons?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[2.5px_2.5px_0px_#000] text-xs space-y-1">
                    <span className="font-black text-black flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span>Explainable AI Priority Factors:</span>
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] font-bold text-neutral-900">
                      {item.priorityReasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resolution Evidence Box (if resolved) */}
                {item.resolutionNotes && (
                  <div className="p-4 rounded-xl bg-[#A3E635] border-2 border-black shadow-[3px_3px_0px_#000] text-xs space-y-2 text-black">
                    <div className="flex items-center space-x-2 font-black text-sm">
                      <FileCheck className="w-4 h-4 text-black" />
                      <span>Verified Resolution Proof Submitted</span>
                    </div>
                    <p className="font-semibold text-[11px] leading-relaxed">{item.resolutionNotes}</p>
                    {item.resolutionImageUrl && (
                      <div className="mt-2">
                        <img
                          src={item.resolutionImageUrl}
                          alt="Resolution evidence"
                          className="max-h-48 rounded-xl object-cover border-2 border-black shadow-[2px_2px_0px_#000]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Location & Metadata Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black text-xs font-bold text-neutral-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-black" />
                      <span>{item.campusZone} ({item.locationDetails})</span>
                    </span>
                    <span>·</span>
                    <span>Dept: <strong className="text-black">{item.assignedDepartment}</strong></span>
                    <span>·</span>
                    <span>By: <strong className="text-black">{item.studentName}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Upvote Button */}
                    <button
                      onClick={() => handleUpvote(item.id)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] transition ${
                        hasUpvoted
                          ? 'bg-[#FFE600] text-black'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-black" />
                      <span>{item.upvotes} Upvotes</span>
                    </button>

                    {/* View Audit Trail */}
                    <button
                      onClick={() => handleInspectComplaint(item)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition"
                    >
                      Audit Trail
                    </button>

                    {/* Student Verify Resolution Button */}
                    {isAuthor && item.status === 'resolved' && (
                      <button
                        onClick={() => handleVerifyResolution(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#A3E635] hover:bg-lime-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_#000] transition"
                      >
                        Confirm Resolved
                      </button>
                    )}

                    {/* Student Escalate Button */}
                    {isAuthor && !['resolved', 'verified_by_student', 'escalated'].includes(item.status) && (
                      <button
                        onClick={() => handleEscalate(item.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FB7185] hover:bg-rose-400 text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] transition"
                      >
                        Escalate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submit Complaint Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[10px_10px_0px_#000] space-y-6 my-8 max-h-[90vh] overflow-y-auto text-black">
            <div className="flex items-center justify-between pb-4 border-b-2 border-black">
              <div>
                <h2 className="text-xl font-black text-black flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-black" />
                  <span>Report Campus Issue</span>
                </h2>
                <p className="text-xs font-semibold text-neutral-700">
                  Earn +25 points on staff triage validation, +50 points on verified resolution.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-black bg-white hover:bg-[#FB7185] border-2 border-black p-1.5 rounded-lg font-black shadow-[1.5px_1.5px_0px_#000]"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-[#FB7185] border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black text-black">
                {submitError}
              </div>
            )}

            {/* AI Duplicate Warning Banner */}
            {duplicateMatches.length > 0 && (
              <div className="p-4 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[3px_3px_0px_#000] text-black text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-black">
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Local AI: Potential Duplicate Issue Detected ({Math.round(duplicateMatches[0].similarityScore * 100)}% match)</span>
                </div>
                <p className="font-semibold text-neutral-900 text-[11px]">
                  Existing ticket <strong>{duplicateMatches[0].complaint.referenceCode}</strong>: &quot;{duplicateMatches[0].complaint.title}&quot; in {duplicateMatches[0].complaint.campusZone}. Consider upvoting existing reports to speed up priority triage!
                </p>
              </div>
            )}

            {/* AI Explainable Priority Live Preview */}
            {aiAnalysis && (
              <div className="p-4 rounded-xl bg-[#38BDF8] border-2 border-black shadow-[3px_3px_0px_#000] text-black text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-black flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>Explainable AI Assessment</span>
                  </span>
                  <span className="font-mono font-black uppercase text-[11px] px-2 py-0.5 rounded bg-white text-black border-2 border-black shadow-[1px_1px_0px_#000]">
                    {aiAnalysis.priority} Priority ({aiAnalysis.score}/100)
                  </span>
                </div>
                <p className="text-[11px] font-bold text-black">
                  Suggested Routing: <strong className="underline">{aiAnalysis.suggestedDepartment}</strong>
                </p>
                <div className="text-[10px] font-bold text-neutral-900 space-y-0.5">
                  {aiAnalysis.reasons.map((r, i) => (
                    <p key={i}>• {r}</p>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black mb-1">Issue Title</label>
                <input
                  type="text"
                  placeholder="e.g. Exposed live wire with sparks in corridor..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">Campus Zone</label>
                  <select
                    value={campusZone}
                    onChange={(e) => setCampusZone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] outline-none"
                  >
                    {CAMPUS_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Specific Location Details</label>
                <input
                  type="text"
                  placeholder="e.g. 3rd Floor corridor, outside Room 314 next to water dispenser"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the defect, safety hazard, or disruption clearly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Photo Evidence URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or campus private upload URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 border-2 border-black rounded"
                />
                <label htmlFor="anonCheck" className="text-xs font-bold text-neutral-800">
                  Submit anonymously to public feed (Identity preserved in secure proctorial audit log)
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title || !description}
                  className="flex-1 py-2.5 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-xs font-black text-black border-2 border-black shadow-[3px_3px_0px_#000] disabled:bg-neutral-200"
                >
                  {isSubmitting ? 'Logging Ticket...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {inspectComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-4 text-black">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div>
                <span className="font-mono text-xs font-black text-black bg-[#38BDF8] px-2 py-0.5 rounded border border-black">{inspectComplaint.referenceCode}</span>
                <h3 className="font-black text-lg text-black mt-1">Full Lifecycle Audit Trail</h3>
              </div>
              <button
                onClick={() => setInspectComplaint(null)}
                className="text-black bg-white hover:bg-[#FB7185] border-2 border-black p-1.5 rounded-lg font-black shadow-[1.5px_1.5px_0px_#000]"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {loadingLogs ? (
                <p className="text-xs font-bold text-neutral-500 py-6 text-center">Loading audit logs...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs font-bold text-neutral-500 py-6 text-center">No audit records recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-black capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] font-bold text-neutral-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-neutral-800">{log.details}</p>
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-neutral-600 pt-1">
                      <span>Actor:</span>
                      <strong className="text-black">{log.actorName}</strong>
                      <span>({log.actorRole})</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setInspectComplaint(null)}
              className="w-full py-2.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100"
            >
              Close History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

