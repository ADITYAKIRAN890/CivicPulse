'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  ShieldCheck,
  Zap,
  GraduationCap,
  Stethoscope,
  Building2,
  Shield,
  UserCheck,
  Coffee,
} from 'lucide-react';

interface QuickPersona {
  role: string;
  label: string;
  name: string;
  email: string;
  department: string;
  targetDashboard: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_PERSONAS: QuickPersona[] = [
  {
    role: 'doctor',
    label: 'Doctor',
    name: 'Dr. Priya Patel',
    email: 'dr.patel@campus.edu',
    department: 'Campus Health Center',
    targetDashboard: 'Doctor Hub (/doctor/dashboard)',
    badgeBg: 'bg-[#A3E635]',
    icon: Stethoscope,
  },
  {
    role: 'student',
    label: 'Student',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@campus.edu',
    department: 'Computer Science',
    targetDashboard: 'Campus Hub (/)',
    badgeBg: 'bg-[#38BDF8]',
    icon: GraduationCap,
  },
  {
    role: 'administrator',
    label: 'Campus Dean',
    name: 'Dr. Meenakshi Sundaram',
    email: 'admin.dean@campus.edu',
    department: 'Office of the Dean',
    targetDashboard: 'Admin Control Hub (/admin)',
    badgeBg: 'bg-[#FB7185]',
    icon: UserCheck,
  },
  {
    role: 'department_staff',
    label: 'Facilities Staff',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@campus.edu',
    department: 'Electrical Facilities',
    targetDashboard: 'Facilities Desk (/department-portal)',
    badgeBg: 'bg-[#FB923C]',
    icon: Building2,
  },
  {
    role: 'grievance_officer',
    label: 'Grievance Officer',
    name: 'Prof. Madhavan Nair',
    email: 'grievance.officer@campus.edu',
    department: 'Ethics & Grievance',
    targetDashboard: 'Grievance Archive (/grievance-portal)',
    badgeBg: 'bg-[#C084FC]',
    icon: Shield,
  },
  {
    role: 'canteen_operator',
    label: 'Canteen POS',
    name: 'Suresh Gupta',
    email: 'canteen.pos@campus.edu',
    department: 'Cafeteria Operations',
    targetDashboard: 'POS Terminal (/canteen-pos)',
    badgeBg: 'bg-[#FFE600]',
    icon: Coffee,
  },
];

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePersonaLoggingIn, setActivePersonaLoggingIn] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'forbidden') {
      setErrorMessage('Access Forbidden: Your account does not have authorization to view that protected dashboard.');
    } else if (errorParam === 'unauthenticated') {
      setErrorMessage('Please sign in with your campus credentials to access that portal.');
    }
  }, [searchParams]);

  const handleLogin = async (e?: React.FormEvent, directEmail?: string, personaName?: string) => {
    if (e) e.preventDefault();
    const loginEmail = directEmail || email;

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your campus email address.');
      return;
    }

    if (directEmail) {
      setEmail(directEmail);
      setPassword('campus123');
    }

    if (personaName) {
      setActivePersonaLoggingIn(personaName);
    }

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: password || 'campus123', // default demo password for local dev
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      setSuccessNotice(`Authentication verified! Signed in as ${data.user.fullName} (${data.user.role.replace(/_/g, ' ')}). Redirecting...`);

      // Immediately write client cookie so layout and navbar can read it
      document.cookie = `civicspulse_user_id=${data.user.id}; path=/; max-age=604800; samesite=lax`;

      // Dispatch custom event so active listeners know session changed
      window.dispatchEvent(new Event('civicspulse-auth-changed'));

      // Determine redirection destination
      const redirectParam = searchParams.get('redirect');
      const destination = redirectParam && redirectParam.startsWith('/') ? redirectParam : data.redirectTo;

      // Force full document navigation to guarantee instant SSR and navbar hydration with persona name
      setTimeout(() => {
        window.location.href = destination;
      }, 250);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setErrorMessage(msg);
      setActivePersonaLoggingIn(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetSubmitting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Password reset request failed.');
      }
      setResetSuccess(data.message || 'Password reset instructions sent to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      setResetError(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 space-y-6 text-black">
      {/* Header */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000]">
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span>Unified Campus Authentication & Demo Mode</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
          CivicsPulse Portal Sign-In
        </h1>
        <p className="text-xs sm:text-sm font-bold text-neutral-700 max-w-xl mx-auto">
          Single secure login for Students, Doctors, Facilities Staff, Grievance Officers, Administrators, and Canteen POS.
        </p>
      </div>

      {/* Main Grid: Credentials Form (Left) + Quick Demo Personas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Credentials Sign-In Form (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b-2 border-black">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <Lock className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black text-black">Institutional Sign-In</h2>
              <p className="text-xs font-bold text-neutral-600">Enter campus email & password</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FB7185] border-2 border-black text-black text-xs font-black flex items-start space-x-2 shadow-[2px_2px_0px_#000]">
              <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-[#A3E635] border-2 border-black text-black text-xs font-black flex items-center space-x-2 shadow-[2px_2px_0px_#000]">
              <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-black mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="e.g. name@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-bold rounded-xl border-2 border-black bg-[#FAF7EE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                />
                <Mail className="w-4 h-4 text-black absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-black">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                  }}
                  className="text-[11px] font-black text-neutral-700 hover:text-black underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-bold rounded-xl border-2 border-black bg-[#FAF7EE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                />
                <KeyRound className="w-4 h-4 text-black absolute left-3 top-3" />
              </div>
              <p className="text-[10px] font-semibold text-neutral-500 mt-1">
                Demo password: <span className="font-mono font-bold text-neutral-800">campus123</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#FFE600] hover:bg-[#FFF066] text-black font-black text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Authenticating & Verifying Role...' : 'Sign In to Campus'}</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </form>

          <div className="pt-3 border-t-2 border-black text-center space-y-2">
            <p className="text-[11px] font-bold text-neutral-700">
              New student joining campus?
            </p>
            <Link
              href="/auth"
              className="inline-block px-3 py-1.5 rounded-lg bg-white border-2 border-black font-black text-xs text-black shadow-[2px_2px_0px_#000] hover:bg-[#FAF7EE] transition"
            >
              Enroll as New Student (+25 Bonus Pts) →
            </Link>
          </div>
        </div>

        {/* Right: Quick Demo Persona Login Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-black fill-black" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">
                    1-Click Demo Quick Login
                  </h3>
                  <p className="text-[11px] font-bold text-neutral-600">
                    Click any persona below to authenticate instantly into their dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {QUICK_PERSONAS.map((p) => {
                const Icon = p.icon;
                const isCurrentLoggingIn = activePersonaLoggingIn === p.name && isSubmitting;
                return (
                  <button
                    key={p.role}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleLogin(undefined, p.email, p.name)}
                    className="p-3 rounded-2xl border-2 border-black text-left transition flex flex-col justify-between space-y-2 shadow-[3px_3px_0px_#000] bg-white hover:bg-[#FFFDE7] hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[4px_4px_0px_#000] group"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl ${p.badgeBg} border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:scale-105 transition`}>
                          <Icon className="w-4 h-4 text-black" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-black leading-tight truncate">{p.name}</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-black inline-block mt-0.5 ${p.badgeBg} shadow-[0.5px_0.5px_0px_#000]`}>
                            {p.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full text-[10px] font-bold text-neutral-800 bg-[#FAF7EE] p-2 rounded-xl border border-black/40 flex items-center justify-between">
                      <span className="truncate text-neutral-900 font-extrabold">{p.targetDashboard}</span>
                      <span className="text-black font-black text-[11px] shrink-0 ml-1">
                        {isCurrentLoggingIn ? 'Signing In...' : '→'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Guarantee Notice */}
          <div className="p-4 rounded-2xl bg-white border-[2.5px] border-black shadow-[4px_4px_0px_#000] flex items-start space-x-3 text-black">
            <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-black text-black">Strict Server-Side Role Enforcement</p>
              <p className="font-semibold text-neutral-700 mt-0.5 leading-snug">
                Roles are retrieved directly from server-side database records. Row-Level Security (RLS) guarantees complete data isolation between roles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border-[3.5px] border-black shadow-[8px_8px_0px_#000] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-black" />
                </div>
                <h3 className="font-black text-base text-black">Reset Campus Password</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetSuccess(null);
                  setResetError(null);
                }}
                className="p-1 rounded-lg border-2 border-black bg-white hover:bg-[#FB7185] text-black shadow-[1.5px_1.5px_0px_#000]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-[#FB7185] border-2 border-black text-black text-xs font-black flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-black shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#A3E635] border-2 border-black text-black text-xs font-black flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-2.5 rounded-xl bg-black text-white font-black text-xs"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-xs font-semibold text-neutral-700">
                  Enter your registered campus email. We will send a secure password reset link to your institutional inbox.
                </p>
                <div>
                  <label className="block text-xs font-black text-black mb-1">
                    Campus Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@campus.edu"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-black bg-[#FAF7EE] focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="w-1/2 py-2.5 rounded-xl border-2 border-black font-black text-xs bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-1/2 py-2.5 rounded-xl border-2 border-black font-black text-xs bg-[#FFE600] hover:bg-[#FFF066] shadow-[2px_2px_0px_#000]"
                  >
                    {resetSubmitting ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto py-12 text-center font-black">Loading CivicsPulse Login...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
