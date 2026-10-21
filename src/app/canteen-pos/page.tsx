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
      <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#FB923C] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
          <Coffee className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-black text-black">Canteen POS Terminal Access Restricted</h2>
        <p className="text-xs font-bold text-neutral-700 leading-relaxed">
          You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
          To evaluate POS scanning and atomic redemption, use the top <strong>Persona Switcher</strong> to switch to <strong>Suresh Gupta (Canteen POS)</strong>.
        </p>
      </div>
    );
  }

  const redeemedList = allCoupons.filter((c) => c.status === 'redeemed');
  const totalRupeesSettled = redeemedList.reduce((acc, c) => acc + c.monetaryValueRupees, 0);

  return (
    <div className="space-y-8 pb-12 text-black">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#FFE600] border-[3.5px] border-black shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black uppercase tracking-wider mb-3">
            <Coffee className="w-4 h-4 text-black" />
            <span>Cafeteria Cashier & POS Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Canteen Coupon Validator & Settlement
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-1 max-w-xl">
            Scan or type student coupon codes for atomic one-time validation, receipt issuance, and instant duplicate protection.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_#000] text-xs">
          <span className="text-neutral-600 block text-[10px] font-bold">Operator on Duty:</span>
          <span className="font-black text-base text-black block">{currentUser?.fullName}</span>
          <span className="font-mono font-black text-black bg-[#FB923C] px-2 py-0.5 rounded border border-black inline-block mt-1 text-[11px]">
            {currentUser?.department || 'Central Cafeteria'}
          </span>
        </div>
      </div>

      {/* POS Scanner & Settlement Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border-[3.5px] border-black shadow-[6px_6px_0px_#000] space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-black flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-black" />
              <span>Coupon Code Verification Terminal</span>
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-[#A3E635] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] font-black uppercase">
              Atomic POS Lock Active
            </span>
          </div>

          {/* Validation Feedback Alerts */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] text-black text-xs space-y-1 animate-shake">
              <div className="flex items-center space-x-2 font-black text-sm text-black">
                <ShieldAlert className="w-5 h-5 shrink-0 text-black" />
                <span>Validation Failure / Security Alert</span>
              </div>
              <p className="font-bold leading-relaxed text-[11px]">{validationError}</p>
            </div>
          )}

          {validationSuccess && (
            <div className="p-5 rounded-2xl bg-[#A3E635] border-2 border-black shadow-[4px_4px_0px_#000] text-black text-xs space-y-3">
              <div className="flex items-center justify-between font-black text-sm text-black">
                <span className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-black" />
                  <span>Coupon Verified & Settled!</span>
                </span>
                <span className="font-mono text-xs bg-white px-2.5 py-0.5 rounded border border-black font-black">
                  {validationSuccess.coupon.redemptionReceiptCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-black text-xs">
                <div>
                  <span className="text-neutral-700 block text-[10px] font-bold">Voucher Item</span>
                  <span className="font-black text-black text-sm">{validationSuccess.coupon.title}</span>
                </div>
                <div>
                  <span className="text-neutral-700 block text-[10px] font-bold">Discount Value</span>
                  <span className="font-black text-black text-base">
                    ₹{validationSuccess.coupon.monetaryValueRupees} OFF
                  </span>
                </div>
                <div>
                  <span className="text-neutral-700 block text-[10px] font-bold">Student</span>
                  <span className="font-black text-black">{validationSuccess.coupon.studentName}</span>
                </div>
                <div>
                  <span className="text-neutral-700 block text-[10px] font-bold">Settled At</span>
                  <span className="font-bold text-neutral-900">{validationSuccess.coupon.redeemedAt ? new Date(validationSuccess.coupon.redeemedAt).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-black mb-2">
                Enter or Scan Voucher Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. CP-CPN-9944-X8"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white border-[2.5px] border-black text-black font-mono font-black text-lg tracking-wider shadow-[3px_3px_0px_#000] focus:shadow-[5px_5px_0px_#000] outline-none uppercase"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isValidating || !couponCodeInput.trim()}
              className="w-full py-4 rounded-2xl bg-[#FB923C] hover:bg-orange-400 disabled:bg-neutral-200 disabled:text-neutral-400 text-black font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-black" />
                  <span>Verifying Single-Use Lock...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5 text-black" />
                  <span>Validate & Settle Coupon</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-Fill Codes for Hackathon Evaluator */}
          <div className="pt-4 border-t-2 border-black space-y-2">
            <span className="text-xs font-black text-neutral-800 block">
              Quick Test Codes for Evaluators:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCouponCodeInput('CP-CPN-9944-X8')}
                className="px-3.5 py-2 rounded-xl bg-[#A3E635] hover:bg-lime-400 text-black font-mono font-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
              >
                CP-CPN-9944-X8 (Active ₹25 Chai)
              </button>
              <button
                type="button"
                onClick={() => setCouponCodeInput('CP-CPN-7731-M2')}
                className="px-3.5 py-2 rounded-xl bg-[#FB7185] hover:bg-rose-400 text-black font-mono font-black border-2 border-black shadow-[2px_2px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
              >
                CP-CPN-7731-M2 (Already Redeemed - Duplicate Test)
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Today's Settle Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border-[3px] border-black shadow-[5px_5px_0px_#000] space-y-4">
            <h3 className="font-black text-base text-black flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-black" />
              <span>Shift Settlement Total</span>
            </h3>

            <div className="p-5 rounded-2xl bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_#000]">
              <span className="text-neutral-800 block text-xs font-bold">Total Discount Value Settled</span>
              <span className="text-4xl font-black text-black">₹{totalRupeesSettled}</span>
            </div>

            <div className="text-xs font-bold text-neutral-800 space-y-2.5">
              <div className="flex justify-between border-b border-neutral-300 pb-1.5">
                <span>Vouchers Processed:</span>
                <strong className="text-black font-black text-sm">{redeemedList.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Counter Station:</span>
                <strong className="text-black font-black">POS-Counter 1 (Main Food Court)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement History Table */}
      <div className="space-y-4 pt-4 border-t-2 border-black">
        <h2 className="text-base font-black text-black">Settlement Audit Log ({redeemedList.length})</h2>
        <div className="bg-white rounded-3xl overflow-hidden border-[3px] border-black shadow-[5px_5px_0px_#000]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7EE] text-black font-black border-b-2 border-black">
                <tr>
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Item Title</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Settled At</th>
                  <th className="py-3.5 px-4">Receipt Ref</th>
                  <th className="py-3.5 px-4 text-right">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-neutral-200 text-neutral-900 font-bold">
                {redeemedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500 font-bold">
                      No vouchers settled on this shift yet.
                    </td>
                  </tr>
                ) : (
                  redeemedList.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF7EE]">
                      <td className="py-3 px-4 font-mono font-black text-black bg-[#FEF08A]/60">{c.couponCode}</td>
                      <td className="py-3 px-4 font-black text-black">{c.title}</td>
                      <td className="py-3 px-4">{c.studentName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                        {c.redeemedAt ? new Date(c.redeemedAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-700 text-[10px]">
                        {c.redemptionReceiptCode || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-black">
                        ₹{c.monetaryValueRupees}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
