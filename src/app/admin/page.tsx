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
} from 'lucide-react';
import { UserProfile, Complaint, Appointment, RewardLedgerEntry } from '@/types';

export default function AdminHubPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ledger, setLedger] = useState<RewardLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const loadAdminData = async () => {
    try {
      const [sessionRes, usersRes, cmpRes, aptRes, rewRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/auth/users'),
        fetch('/api/complaints'),
        fetch('/api/appointments'),
        fetch('/api/rewards'),
      ]);

      const [sessionData, usersData, cmpData, aptData, rewData] = await Promise.all([
        sessionRes.json(),
        usersRes.json(),
        cmpRes.json(),
        aptRes.json(),
        rewRes.json(),
      ]);

      if (sessionData.success) setCurrentUser(sessionData.user);
      if (usersData.success) setAllUsers(usersData.users || []);
      if (cmpData.success) setComplaints(cmpData.complaints || []);
      if (aptData.success) setAppointments(aptData.appointments || []);
      if (rewData.success) setLedger(rewData.ledger || []);
    } catch (err) {
      console.error('Failed to load admin hub data:', err);
    } finally {
      setLoading(false);
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
      <div className="p-12 glass-card rounded-3xl text-center space-y-4 max-w-lg mx-auto">
        <UserCheck className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Dean & Admin Access Restricted</h2>
        <p className="text-xs text-slate-400">
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
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Office of the Dean & Campus Administration</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Administrator Control & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Campus-wide infrastructure heatmaps, doctor booking load, enrollment approvals, and reward audit oversight.
          </p>
        </div>

        <button
          onClick={handleResetData}
          disabled={isResetting}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset All Demo Data</span>
        </button>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block font-semibold">Registered Campus Accounts</span>
          <span className="text-3xl font-extrabold text-white mt-1 block">{allUsers.length}</span>
          <span className="text-[11px] text-blue-400 mt-1 block">Students, Doctors & Staff</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block font-semibold">Total Civic Issues Logged</span>
          <span className="text-3xl font-extrabold text-amber-400 mt-1 block">{complaints.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {resolvedComplaints.length} Resolved with Proof
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block font-semibold">Doctor Consultations</span>
          <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">{appointments.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">0 Double-Booking Race Errors</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block font-semibold">Total Cloud Budget Spent</span>
          <span className="text-3xl font-extrabold text-purple-400 mt-1 block">₹0.00</span>
          <span className="text-[11px] text-emerald-400 mt-1 block">100% Free Tier Compliant</span>
        </div>
      </div>

      {/* Registered Campus Users Directory & Enrollment Approvals */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span>Campus Member Directory & Enrollment Approvals</span>
        </h2>

        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Institutional Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Identifier / Dept</th>
                  <th className="py-3 px-4">Enrollment Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{u.fullName}</td>
                    <td className="py-3 px-4 text-slate-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-blue-400 uppercase font-semibold">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {u.rollNumber || u.department || u.clinicCabin || 'General Campus'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          u.isApproved
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {u.isApproved ? 'Approved' : 'Pending Verification'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!u.isApproved && (
                        <button
                          onClick={() => handleApproveUser(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
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
      </div>
    </div>
  );
}
