'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="max-w-xl mx-auto py-8 space-y-8 text-black">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000]">
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span>Verified Student Access</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">Student Enrollment Portal</h1>
        <p className="text-xs font-bold text-neutral-700 max-w-md mx-auto">
          Sign up with your institutional email to book doctor visits, report issues, and earn civic points.
        </p>
      </div>

      {/* Registration Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#FB7185] border-2 border-black text-black text-xs font-black flex items-center space-x-2 shadow-[2px_2px_0px_#000]">
            <AlertCircle className="w-4 h-4 text-black shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-black mb-1">Full Legal Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-600 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Rohan Verma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Institutional Email (@campus.edu or @college.ac.in)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-600 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                placeholder="e.g. rohan.verma@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-black mb-1">Roll / Student ID</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-neutral-600 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="CS2024-089"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold uppercase shadow-[2.5px_2.5px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1">Academic Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-black text-black text-xs font-bold shadow-[2.5px_2.5px_0px_#000] outline-none"
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
            className="w-full py-3.5 rounded-2xl bg-[#FFE600] hover:bg-yellow-300 disabled:bg-neutral-200 text-black font-black text-xs border-2 border-black shadow-[3.5px_3.5px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Verifying Institutional Domain...' : 'Register & Verify Student Account'}</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </form>

        <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
          <span className="text-neutral-700">Already registered or campus staff?</span>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl bg-[#38BDF8] border-2 border-black font-black text-black shadow-[2px_2px_0px_#000] hover:bg-[#7DD3FC] transition"
          >
            Go to Unified Sign-In Portal →
          </Link>
        </div>

        <div className="pt-2 text-[11px] text-neutral-700 font-bold leading-relaxed flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-black shrink-0 mt-0.5" />
          <span>
            Privileged roles (Doctor, Facilities Staff, Grievance Officer, Dean, Canteen POS) are managed by university administration and cannot be self-assigned.
          </span>
        </div>
      </div>

      {/* Quick Demo Login Box for Evaluators */}
      <div className="bg-white p-6 rounded-3xl border-[3px] border-black shadow-[6px_6px_0px_#000] space-y-3">
        <span className="text-xs font-black text-black block">
          Hackathon Quick Persona Selector:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <button
            onClick={() => handleQuickDemoLogin('user-student-1')}
            className="p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFE600] text-left transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-black text-black block">Aarav Sharma</span>
            <span className="text-[10px] font-bold text-neutral-800">Student (75 pts)</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-doctor-1')}
            className="p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#A3E635] text-left transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-black text-black block">Dr. Priya Patel</span>
            <span className="text-[10px] font-bold text-neutral-800">Clinic Doctor</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-dept-staff-1')}
            className="p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FB923C] text-left transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-black text-black block">Rajesh Kumar</span>
            <span className="text-[10px] font-bold text-neutral-800">Dept Facilities</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-grievance-1')}
            className="p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#C084FC] text-left transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-black text-black block">Prof. M. Nair</span>
            <span className="text-[10px] font-bold text-neutral-800">Grievance Officer</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-admin-1')}
            className="p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FB7185] text-left transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-black text-black block">Dean Office</span>
            <span className="text-[10px] font-bold text-neutral-800">Campus Admin</span>
          </button>
          <button
            onClick={() => handleQuickDemoLogin('user-canteen-1')}
            className="p-3 rounded-xl bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#38BDF8] text-left transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-black text-black block">Suresh Gupta</span>
            <span className="text-[10px] font-bold text-neutral-800">Canteen POS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
