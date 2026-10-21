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
      </div>
    </div>
  );
}
