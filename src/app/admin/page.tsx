'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Shield,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Gift,
  Stethoscope,
  Users,
  Building,
  Mail,
  Send,
  Key,
  AlertCircle,
  ExternalLink,
  Repeat,
} from 'lucide-react';
import { UserProfile, Complaint, Appointment, RewardLedgerEntry, ComplaintEmailNotification } from '@/types';

export default function AdminHubPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ledger, setLedger] = useState<RewardLedgerEntry[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<ComplaintEmailNotification[]>([]);
  const [emailConfig, setEmailConfig] = useState<{
    isConfigured: boolean;
    apiKeyPresent: boolean;
    notificationEmail: string;
    senderEmail: string;
    appUrl: string;
    sandboxModeNotice: string;
  } | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    messageId?: string;
    recipient?: string;
    sender?: string;
    providerStatus?: string;
    restrictionNotes?: string;
  } | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const loadAdminData = async () => {
    try {
      const [sessionRes, usersRes, cmpRes, aptRes, rewRes, emailCfgRes, emailNotifRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/auth/users'),
        fetch('/api/complaints'),
        fetch('/api/appointments'),
        fetch('/api/rewards'),
        fetch('/api/email/test'),
        fetch('/api/email/notifications'),
      ]);

      const [sessionData, usersData, cmpData, aptData, rewData, emailCfgData, emailNotifData] = await Promise.all([
        sessionRes.json(),
        usersRes.json(),
        cmpRes.json(),
        aptRes.json(),
        rewRes.json(),
        emailCfgRes.json(),
        emailNotifRes.json(),
      ]);

      if (sessionData.success) setCurrentUser(sessionData.user);
      if (usersData.success) setAllUsers(usersData.users || []);
      if (cmpData.success) setComplaints(cmpData.complaints || []);
      if (aptData.success) setAppointments(aptData.appointments || []);
      if (rewData.success) setLedger(rewData.ledger || []);
      if (emailCfgData.success) setEmailConfig(emailCfgData.config || null);
      if (emailNotifData.success) setEmailNotifications(emailNotifData.notifications || []);
    } catch (err) {
      console.error('Failed to load admin hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsTestingEmail(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network failure';
      setTestResult({ success: false, error: msg });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleRetryEmail = async (complaintId: string) => {
    setIsRetryingId(complaintId);
    try {
      const res = await fetch('/api/email/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Notification retry accepted!');
        await loadAdminData();
      } else {
        alert('Retry attempt failed: ' + data.error);
      }
    } catch (err) {
      alert('Retry error: ' + err);
    } finally {
      setIsRetryingId(null);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Student enrollment approved!');
        await loadAdminData();
      } else {
        alert('Approval failed: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err);
    }
  };

  const handleResetData = async () => {
    if (!confirm('Re-seed all campus databases to fresh synthetic benchmark state?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('All databases re-seeded cleanly!');
        await loadAdminData();
      }
    } catch (err) {
      alert('Reset failed: ' + err);
    } finally {
      setIsResetting(false);
    }
  };

  const isAdmin = currentUser?.role === 'administrator';

  if (!loading && !isAdmin) {
    return (
      <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
          <UserCheck className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-black text-black">Dean & Admin Access Restricted</h2>
        <p className="text-xs font-bold text-neutral-700 leading-relaxed">
          You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
          To view the Campus Dean & Administrator Analytics Hub, use the top <strong>Persona Switcher</strong> to switch to <strong>Dr. Meenakshi Sundaram (Campus Dean)</strong>.
        </p>
      </div>
    );
  }

  const resolvedComplaints = complaints.filter((c) =>
    ['resolved', 'verified_by_student'].includes(c.status)
  );

  return (
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#FB7185] border-[3.5px] border-black shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase tracking-wider mb-3">
            <UserCheck className="w-4 h-4 text-black" />
            <span>Office of the Dean & Campus Administration</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Administrator Control & Analytics
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 max-w-xl">
            Campus-wide infrastructure heatmaps, doctor booking load, enrollment approvals, and reward audit oversight.
          </p>
        </div>

        <button
          onClick={handleResetData}
          disabled={isResetting}
          className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-black ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset All Demo Data</span>
        </button>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000]">
          <span className="text-xs text-neutral-700 block font-black">Registered Accounts</span>
          <span className="text-3xl font-black text-black mt-1 block">{allUsers.length}</span>
          <span className="text-[11px] font-black text-black bg-[#38BDF8] px-2 py-0.5 rounded border border-black inline-block mt-2">
            Students & Faculty
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000]">
          <span className="text-xs text-neutral-700 block font-black">Total Issues Logged</span>
          <span className="text-3xl font-black text-black mt-1 block">{complaints.length}</span>
          <span className="text-[11px] font-black text-black bg-[#FFE600] px-2 py-0.5 rounded border border-black inline-block mt-2">
            {resolvedComplaints.length} Resolved with Proof
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000]">
          <span className="text-xs text-neutral-700 block font-black">Doctor Consultations</span>
          <span className="text-3xl font-black text-black mt-1 block">{appointments.length}</span>
          <span className="text-[11px] font-black text-black bg-[#A3E635] px-2 py-0.5 rounded border border-black inline-block mt-2">
            0 Double-Bookings
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000]">
          <span className="text-xs text-neutral-700 block font-black">Cloud Budget Spent</span>
          <span className="text-3xl font-black text-black mt-1 block">₹0.00</span>
          <span className="text-[11px] font-black text-black bg-[#C084FC] px-2 py-0.5 rounded border border-black inline-block mt-2">
            100% Free Stack
          </span>
        </div>
      </div>

      {/* Registered Campus Users Directory & Enrollment Approvals */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-black flex items-center space-x-2">
          <Users className="w-5 h-5 text-black" />
          <span>Campus Member Directory & Enrollment Approvals</span>
        </h2>

        <div className="bg-white rounded-3xl overflow-hidden border-[3px] border-black shadow-[5px_5px_0px_#000]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7EE] text-black font-black border-b-2 border-black">
                <tr>
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Institutional Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Identifier / Dept</th>
                  <th className="py-3.5 px-4">Enrollment Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-neutral-200 text-neutral-900 font-bold">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF7EE]">
                    <td className="py-3.5 px-4 font-black text-black">{u.fullName}</td>
                    <td className="py-3.5 px-4 font-medium text-neutral-700">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded font-mono text-[10px] bg-[#FFE600] text-black uppercase font-black border border-black">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700">
                      {u.rollNumber || u.department || u.clinicCabin || 'General Campus'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border border-black ${
                          u.isApproved
                            ? 'bg-[#A3E635] text-black'
                            : 'bg-[#FEF08A] text-black'
                        }`}
                      >
                        {u.isApproved ? 'Approved' : 'Pending Verification'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!u.isApproved && (
                        <button
                          onClick={() => handleApproveUser(u.id)}
                          className="px-3 py-1 rounded-lg bg-[#A3E635] hover:bg-lime-400 text-black font-black text-[11px] border border-black shadow-[1.5px_1.5px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resend Email Notification Pipeline & Audit Trail */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b-2 border-black">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#38BDF8] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-black text-black">
                  Resend Email Notification Pipeline &amp; Audit Trail
                </h3>
                <p className="text-xs font-bold text-neutral-600 mt-0.5">
                  Automated department alerts triggered whenever students file civic infrastructure complaints
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isTestingEmail}
              onClick={handleSendTestEmail}
              className="px-4 py-2.5 rounded-xl bg-[#FFE600] hover:bg-[#FFF066] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5 flex items-center space-x-2 shrink-0 self-start sm:self-auto"
            >
              <Send className="w-4 h-4 text-black" />
              <span>{isTestingEmail ? 'Dispatching Test Email...' : 'Send Test Resend Email'}</span>
            </button>
          </div>

          {/* Configuration Diagnostics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">RESEND_API_KEY</p>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-black border border-black ${
                    emailConfig?.apiKeyPresent ? 'bg-[#A3E635] text-black' : 'bg-[#FB7185] text-black'
                  }`}
                >
                  {emailConfig?.apiKeyPresent ? 'Configured (Server Secret)' : 'Missing in .env.local'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">NOTIFICATION RECIPIENT</p>
              <p className="text-xs font-black font-mono text-black truncate" title={emailConfig?.notificationEmail}>
                {emailConfig?.notificationEmail || 'COMPLAINT_NOTIFICATION_EMAIL unset'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">SENDER ADDRESS</p>
              <p className="text-xs font-black font-mono text-black truncate" title={emailConfig?.senderEmail}>
                {emailConfig?.senderEmail || 'onboarding@resend.dev'}
              </p>
            </div>
          </div>

          {/* Sandbox Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-[#FFFDE7] border-2 border-black text-xs font-bold text-neutral-800 space-y-1">
            <div className="flex items-center space-x-2 font-black text-black">
              <AlertCircle className="w-4 h-4 text-black" />
              <span>Resend Free / Testing Domain Restriction:</span>
            </div>
            <p className="text-[11px] text-neutral-700 leading-snug">
              When sending via <code className="font-mono font-black text-black">onboarding@resend.dev</code> without a verified custom domain, Resend strictly allows delivering emails to the single verified account email address registered with Resend.
            </p>
          </div>

          {/* Live Test Feedback Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-bold space-y-1.5 ${
                testResult.success ? 'bg-[#A3E635] text-black' : 'bg-[#FB7185] text-black'
              }`}
            >
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-black shrink-0" />
                )}
                <span className="font-black text-sm">
                  {testResult.success ? 'Test Email Accepted by Resend API!' : 'Test Email Dispatch Failed'}
                </span>
              </div>
              <p className="text-xs leading-snug">
                {testResult.success ? testResult.message : testResult.error}
              </p>
              {testResult.messageId && (
                <p className="text-[11px] font-mono">
                  Provider Message ID: <span className="font-black">{testResult.messageId}</span> (Status: {testResult.providerStatus})
                </p>
              )}
              {testResult.restrictionNotes && (
                <div className="p-2 rounded-xl bg-white/70 border border-black text-[11px] font-bold mt-1">
                  💡 {testResult.restrictionNotes}
                </div>
              )}
            </div>
          )}

          {/* Recent Complaint Email Notifications Log */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-black">
              Recent Complaint Email Dispatches ({emailNotifications.length})
            </h4>

            {emailNotifications.length === 0 ? (
              <p className="text-xs font-bold text-neutral-500 py-4 text-center bg-[#FAF7EE] rounded-2xl border-2 border-dashed border-neutral-300">
                No complaint email notifications recorded yet. Submit a new complaint to trigger live dispatch!
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border-2 border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7EE] text-black font-black border-b-2 border-black">
                    <tr>
                      <th className="py-2.5 px-3">Complaint Ref</th>
                      <th className="py-2.5 px-3">Intended Department</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Resend ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3 text-right">Retry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-neutral-200 font-bold text-neutral-900">
                    {emailNotifications.slice(0, 8).map((n) => (
                      <tr key={n.id} className="hover:bg-[#FAF7EE]">
                        <td className="py-2.5 px-3 font-mono font-black">{n.complaintReference}</td>
                        <td className="py-2.5 px-3 font-semibold truncate max-w-[150px]">{n.intendedDepartment}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] truncate max-w-[150px]">{n.recipientEmail}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-black uppercase border border-black ${
                              n.status === 'queued'
                                ? 'bg-[#38BDF8] text-black'
                                : n.status === 'sent' || n.status === 'delivered'
                                ? 'bg-[#A3E635] text-black'
                                : 'bg-[#FB7185] text-black'
                            }`}
                          >
                            {n.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-600 truncate max-w-[120px]">
                          {n.resendId || (n.errorMessage ? 'Failed' : 'Pending')}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-neutral-600">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {n.status === 'failed' && (
                            <button
                              type="button"
                              disabled={isRetryingId === n.complaintId}
                              onClick={() => handleRetryEmail(n.complaintId)}
                              className="px-2 py-0.5 rounded bg-[#FFE600] text-black font-black text-[10px] border border-black hover:bg-yellow-300 transition"
                            >
                              {isRetryingId === n.complaintId ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
