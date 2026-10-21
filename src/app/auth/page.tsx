'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Mail,
  User,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          rollNumber,
          department,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      alert('Student enrollment verified! Welcome bonus (+25 points) credited to your new Civic Wallet.');
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Quick demo login error:', err);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Verified Student Access</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Student Enrollment Portal</h1>
        <p className="text-xs text-slate-400">
          Sign up with your institutional email to book doctor visits, report issues, and earn civic points.
        </p>
      </div>

      {/* Registration Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Full Legal Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Rohan Verma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Institutional Email (@campus.edu or @college.ac.in)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="e.g. rohan.verma@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Roll / Student ID</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="CS2024-089"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs uppercase focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Academic Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="Computer Science & Engineering">Computer Science</option>
                <option value="Electronics & Communication">Electronics & Comm</option>
                <option value="Mechanical Engineering">Mechanical Engg</option>
                <option value="Civil & Environmental Engg">Civil & Environment</option>
                <option value="Biotechnology & Sciences">Biotechnology</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Verifying Institutional Domain...' : 'Register & Verify Student Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Privileged roles (Doctor, Facilities Staff, Grievance Officer, Dean, Canteen POS) are managed by university administration and cannot be self-assigned.
          </span>
        </div>
      </div>

      {/* Quick Demo Login Box for Evaluators */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
        <span className="text-xs font-bold text-slate-300 block">
          Hackathon Quick Persona Selector:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => handleQuickDemoLogin('user-student-1')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500 text-left"
          >
            <span className="font-bold text-white block">Aarav Sharma</span>
            <span className="text-[10px] text-blue-400">Student (75 pts)</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-doctor-1')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-left"
          >
            <span className="font-bold text-white block">Dr. Priya Patel</span>
            <span className="text-[10px] text-emerald-400">Clinic Doctor</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-dept-staff-1')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-left"
          >
            <span className="font-bold text-white block">Rajesh Kumar</span>
            <span className="text-[10px] text-amber-400">Dept Facilities</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-grievance-1')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500 text-left"
          >
            <span className="font-bold text-white block">Prof. M. Nair</span>
            <span className="text-[10px] text-purple-400">Grievance Officer</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-admin-1')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500 text-left"
          >
            <span className="font-bold text-white block">Dean Office</span>
            <span className="text-[10px] text-rose-400">Campus Admin</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-canteen-1')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-orange-500 text-left"
          >
            <span className="font-bold text-white block">Suresh Gupta</span>
            <span className="text-[10px] text-orange-400">Canteen POS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
