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
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Civic Incident Tracking & Zero-Cost AI Triage</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Campus Issues & Infrastructure
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Report hostel, electrical, Wi-Fi, hygiene and lab breakdowns. Real-time duplicate suggestion and explainable priority scoring.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Report New Campus Issue</span>
        </button>
      </div>

      {/* Staff Behaviour Grievance Link Notice */}
      <div className="p-4 rounded-2xl glass-card border border-purple-900/40 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block">Looking for confidential staff or proctor grievances?</span>
            Staff-behaviour and ethics complaints are handled in a strictly separate, sealed workflow accessible only by the Grievance Officer.
          </div>
        </div>
        <Link
          href="/grievance-portal"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold border border-purple-500/30 transition shrink-0"
        >
          <span>Open Grievance Desk</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, keyword, or campus zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
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
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
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
          <div className="p-12 text-center text-slate-400">Loading campus reports...</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 glass-card rounded-2xl text-center text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No complaints matching filter criteria.</p>
          </div>
        ) : (
          filteredComplaints.map((item) => {
            const isAuthor = currentUser?.id === item.studentId;
            const hasUpvoted = currentUser ? item.upvotedBy.includes(currentUser.id) : false;

            return (
              <div
                key={item.id}
                className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800 space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                      {item.referenceCode}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.priority === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : item.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      AI Priority: {item.priority} ({item.priorityScore}/100)
                    </span>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      item.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.status === 'verified_by_student'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : item.status === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : item.status === 'triaged'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                </div>

                {/* Explainable AI Factors */}
                {item.priorityReasons?.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Explainable AI Priority Factors:</span>
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
                      {item.priorityReasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resolution Evidence Box (if resolved) */}
                {item.resolutionNotes && (
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-2">
                    <div className="flex items-center space-x-2 font-bold text-emerald-400">
                      <FileCheck className="w-4 h-4" />
                      <span>Verified Resolution Proof Submitted</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{item.resolutionNotes}</p>
                    {item.resolutionImageUrl && (
                      <div className="mt-2">
                        <img
                          src={item.resolutionImageUrl}
                          alt="Resolution evidence"
                          className="max-h-48 rounded-xl object-cover border border-emerald-500/30"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Location & Metadata Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.campusZone} ({item.locationDetails})</span>
                    </span>
                    <span>·</span>
                    <span>Dept: <strong className="text-slate-300">{item.assignedDepartment}</strong></span>
                    <span>·</span>
                    <span>By: <strong className="text-slate-300">{item.studentName}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Upvote Button */}
                    <button
                      onClick={() => handleUpvote(item.id)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                        hasUpvoted
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{item.upvotes} Upvotes</span>
                    </button>

                    {/* View Audit Trail */}
                    <button
                      onClick={() => handleInspectComplaint(item)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                    >
                      Audit Trail
                    </button>

                    {/* Student Verify Resolution Button */}
                    {isAuthor && item.status === 'resolved' && (
                      <button
                        onClick={() => handleVerifyResolution(item.id)}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition"
                      >
                        Confirm Resolved
                      </button>
                    )}

                    {/* Student Escalate Button */}
                    {isAuthor && !['resolved', 'verified_by_student', 'escalated'].includes(item.status) && (
                      <button
                        onClick={() => handleEscalate(item.id)}
                        className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl glass-card rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Report Campus Issue</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Earn +25 points on staff triage validation, +50 points on verified resolution.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {submitError}
              </div>
            )}

            {/* AI Duplicate Warning Banner */}
            {duplicateMatches.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Local AI: Potential Duplicate Issue Detected ({Math.round(duplicateMatches[0].similarityScore * 100)}% match)</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Existing ticket <strong>{duplicateMatches[0].complaint.referenceCode}</strong>: &quot;{duplicateMatches[0].complaint.title}&quot; in {duplicateMatches[0].complaint.campusZone}. Consider upvoting existing reports to speed up priority triage!
                </p>
              </div>
            )}

            {/* AI Explainable Priority Live Preview */}
            {aiAnalysis && (
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explainable AI Assessment</span>
                  </span>
                  <span className="font-mono font-bold uppercase text-[11px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">
                    {aiAnalysis.priority} Priority ({aiAnalysis.score}/100)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Suggested Routing: <strong className="text-white">{aiAnalysis.suggestedDepartment}</strong>
                </p>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  {aiAnalysis.reasons.map((r, i) => (
                    <p key={i}>• {r}</p>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Issue Title</label>
                <input
                  type="text"
                  placeholder="e.g. Exposed live wire with sparks in corridor..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Campus Zone</label>
                  <select
                    value={campusZone}
                    onChange={(e) => setCampusZone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Specific Location Details</label>
                <input
                  type="text"
                  placeholder="e.g. 3rd Floor corridor, outside Room 314 next to water dispenser"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the defect, safety hazard, or disruption clearly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Photo Evidence URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or campus private upload URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                />
                <label htmlFor="anonCheck" className="text-xs text-slate-300">
                  Submit anonymously to public feed (Identity preserved in secure proctorial audit log)
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title || !description}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30 disabled:bg-slate-800 disabled:text-slate-600"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-400">{inspectComplaint.referenceCode}</span>
                <h3 className="font-bold text-base text-white">Full Lifecycle Audit Trail</h3>
              </div>
              <button
                onClick={() => setInspectComplaint(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {loadingLogs ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading audit logs...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No audit records recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{log.details}</p>
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 pt-1">
                      <span>Actor:</span>
                      <strong className="text-slate-400">{log.actorName}</strong>
                      <span>({log.actorRole})</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setInspectComplaint(null)}
              className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Close History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
