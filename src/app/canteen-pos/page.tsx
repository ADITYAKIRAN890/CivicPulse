'use client';

import React, { useState, useEffect } from 'react';
import {
  Coffee,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  User,
  Receipt,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CanteenCoupon, UserProfile } from '@/types';

export default function CanteenPosPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allCoupons, setAllCoupons] = useState<CanteenCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Input code
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState<{
    coupon: CanteenCoupon;
    message: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sessionRes, rewRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/rewards'),
      ]);
      const [sessionData, rewData] = await Promise.all([sessionRes.json(), rewRes.json()]);

      if (sessionData.success) setCurrentUser(sessionData.user);
      if (rewData.success) setAllCoupons(rewData.coupons || []);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;

    setValidationError(null);
    setValidationSuccess(null);
    setIsValidating(true);

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCodeInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Coupon redemption rejected');
      }

      setValidationSuccess({
        coupon: data.coupon,
        message: data.message,
      });
      setCouponCodeInput('');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Redemption rejected';
      setValidationError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  const isOperatorOrAdmin =
    currentUser?.role === 'canteen_operator' || currentUser?.role === 'administrator';

  if (!loading && !isOperatorOrAdmin) {
    return (
      <div className="p-12 glass-card rounded-3xl text-center space-y-4 max-w-lg mx-auto">
        <Coffee className="w-12 h-12 text-orange-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Canteen POS Terminal Access Restricted</h2>
        <p className="text-xs text-slate-400">
          You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
          To evaluate POS scanning and atomic redemption, use the top <strong>Persona Switcher</strong> to switch to <strong>Suresh Gupta (Canteen POS)</strong>.
        </p>
      </div>
    );
  }

  const redeemedList = allCoupons.filter((c) => c.status === 'redeemed');
  const totalRupeesSettled = redeemedList.reduce((acc, c) => acc + c.monetaryValueRupees, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Coffee className="w-4 h-4" />
            <span>Cafeteria Cashier & POS Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Canteen Coupon Validator & Settlement
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Scan or type student coupon codes for atomic one-time validation, receipt issuance, and instant duplicate protection.
          </p>
        </div>

        <div className="p-3 rounded-2xl glass-card border border-orange-500/30 text-xs">
          <span className="text-slate-400 block text-[10px]">Operator on Duty:</span>
          <span className="font-bold text-white">{currentUser?.fullName}</span>
          <span className="text-orange-400 block text-[11px]">{currentUser?.department || 'Central Cafeteria'}</span>
        </div>
      </div>

      {/* POS Scanner & Settlement Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-orange-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-orange-400" />
              <span>Coupon Code Verification Terminal</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold uppercase">
              Atomic POS Lock Active
            </span>
          </div>

          {/* Validation Feedback Alerts */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs space-y-1.5 animate-shake">
              <div className="flex items-center space-x-2 font-bold text-sm text-rose-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Validation Failure / Security Alert</span>
              </div>
              <p className="leading-relaxed text-[11px]">{validationError}</p>
            </div>
          )}

          {validationSuccess && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs space-y-3">
              <div className="flex items-center justify-between font-bold text-sm text-emerald-400">
                <span className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Coupon Verified & Settled!</span>
                </span>
                <span className="font-mono text-xs bg-emerald-500/20 px-2 py-0.5 rounded">
                  {validationSuccess.coupon.redemptionReceiptCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Voucher Item</span>
                  <span className="font-semibold text-white">{validationSuccess.coupon.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Discount Value</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{validationSuccess.coupon.monetaryValueRupees} OFF
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Student</span>
                  <span className="text-white">{validationSuccess.coupon.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Settled At</span>
                  <span className="text-white">{validationSuccess.coupon.redeemedAt ? new Date(validationSuccess.coupon.redeemedAt).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Enter or Scan Voucher Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. CP-CPN-9944-X8"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base tracking-wider focus:outline-none focus:border-orange-500 uppercase"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isValidating || !couponCodeInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm shadow-xl shadow-orange-600/20 transition flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Single-Use Lock...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Validate & Settle Coupon</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-Fill Codes for Hackathon Evaluator */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <span className="text-xs font-semibold text-slate-400 block">
              Quick Test Codes for Evaluators:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCouponCodeInput('CP-CPN-9944-X8')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-emerald-400 font-mono"
              >
                CP-CPN-9944-X8 (Active ₹25 Chai)
              </button>
              <button
                type="button"
                onClick={() => setCouponCodeInput('CP-CPN-7731-M2')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500 text-rose-400 font-mono"
              >
                CP-CPN-7731-M2 (Already Redeemed - Tests Duplicate Rejection)
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Today's Settle Summary */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-orange-400" />
              <span>Shift Settlement Total</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-xs">Total Discount Value Settled</span>
              <span className="text-3xl font-black text-emerald-400">₹{totalRupeesSettled}</span>
            </div>

            <div className="text-xs text-slate-400 space-y-2">
              <div className="flex justify-between">
                <span>Vouchers Processed:</span>
                <strong className="text-white">{redeemedList.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Counter Station:</span>
                <strong className="text-white">POS-Counter 1 (Main Food Court)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement History Table */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-base font-bold text-white">Settlement Audit Log ({redeemedList.length})</h2>
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Item Title</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Settled At</th>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {redeemedList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-orange-400">{c.couponCode}</td>
                    <td className="py-3 px-4 font-medium text-white">{c.title}</td>
                    <td className="py-3 px-4">{c.studentName}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {c.redeemedAt ? new Date(c.redeemedAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[10px]">
                      {c.redemptionReceiptCode || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      ₹{c.monetaryValueRupees}
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
