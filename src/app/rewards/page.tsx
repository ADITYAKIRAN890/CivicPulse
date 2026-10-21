'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gift,
  Award,
  Coffee,
  Utensils,
  BookOpen,
  CupSoda,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  TrendingUp,
  History,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserWallet, RewardLedgerEntry, CanteenCatalogItem, CanteenCoupon, UserProfile } from '@/types';

export default function RewardsPage() {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [ledger, setLedger] = useState<RewardLedgerEntry[]>([]);
  const [catalog, setCatalog] = useState<CanteenCatalogItem[]>([]);
  const [coupons, setCoupons] = useState<CanteenCoupon[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [justPurchasedCoupon, setJustPurchasedCoupon] = useState<CanteenCoupon | null>(null);

  const loadRewardsData = async () => {
    try {
      const [rewRes, sessionRes] = await Promise.all([
        fetch('/api/rewards'),
        fetch('/api/auth/session'),
      ]);
      const [rewData, sessionData] = await Promise.all([rewRes.json(), sessionRes.json()]);

      if (rewData.success) {
        setWallet(rewData.wallet || null);
        setLedger(rewData.ledger || []);
        setCatalog(rewData.catalog || []);
        setCoupons(rewData.coupons || []);
      }
      if (sessionData.success) setCurrentUser(sessionData.user);
    } catch (err) {
      console.error('Failed to load rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, []);

  const handlePurchaseCoupon = async (catalogItemId: string) => {
    setPurchaseError(null);
    setJustPurchasedCoupon(null);
    setPurchasingItemId(catalogItemId);

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogItemId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate coupon voucher');
      }

      setJustPurchasedCoupon(data.coupon);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      await loadRewardsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coupon purchase failed';
      setPurchaseError(msg);
    } finally {
      setPurchasingItemId(null);
    }
  };

  const activeCoupons = coupons.filter((c) => c.status === 'active');
  const redeemedCoupons = coupons.filter((c) => c.status !== 'active');

  const getCatalogIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coffee':
        return <Coffee className="w-5 h-5 text-amber-400" />;
      case 'Utensils':
        return <Utensils className="w-5 h-5 text-emerald-400" />;
      case 'CupSoda':
        return <CupSoda className="w-5 h-5 text-cyan-400" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-purple-400" />;
      default:
        return <Gift className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Gift className="w-4 h-4" />
            <span>Campus Civic Rewards & Single-Use Canteen POS Vouchers</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Civic Wallet & Canteen Store
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Earn PulsePoints when campus facilities resolve your reported civic issues. Convert points into approved food vouchers.
          </p>
        </div>

        {/* Quick Link to Canteen POS */}
        <Link
          href="/canteen-pos"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-bold transition self-start md:self-auto"
        >
          <Coffee className="w-4 h-4" />
          <span>Switch to Canteen POS Terminal →</span>
        </Link>
      </div>

      {/* Ethical Reward Policy Alert */}
      <div className="p-4 rounded-2xl glass-card border border-emerald-900/40 bg-emerald-950/20 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white block mb-0.5">Strict Ethical Reward Architecture</span>
          Points are awarded <strong>only</strong> for validated civic milestones (+25 pts on staff triage validation, +50 pts on verified resolution). 
          Doctor appointments, health visits, and medical disclosures are <strong>strictly unrewarded</strong> to safeguard student privacy and prevent gamification.
        </div>
      </div>

      {/* Wallet Balance Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-blue-900/40 bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/30 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
              <Award className="w-4 h-4" />
              <span>CivicsPulse Student Wallet</span>
            </span>
            <span className="text-xs text-slate-400">{currentUser?.fullName} ({currentUser?.rollNumber || 'Student'})</span>
          </div>

          <div className="mt-4 flex items-baseline space-x-3">
            <span className="text-4xl sm:text-6xl font-black text-white tracking-tight">
              {loading ? '...' : wallet?.balance || 0}
            </span>
            <span className="text-base sm:text-xl font-bold text-blue-400 uppercase tracking-widest">
              Points (PulsePoints)
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Lifetime Civic Points Earned</span>
              <span className="text-base font-bold text-emerald-400">+{wallet?.lifetimeEarned || 0} pts</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Points Redeemed at Canteen</span>
              <span className="text-base font-bold text-slate-200">-{wallet?.lifetimeSpent || 0} pts</span>
            </div>
          </div>
        </div>

        {/* Quick Earn Guide */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Point Milestones</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Earn points solely by helping improve campus infrastructure:</p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-300">Staff Triage Validation</span>
                <span className="font-bold text-emerald-400">+25 pts</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-300">Resolved with Evidence</span>
                <span className="font-bold text-emerald-400">+50 pts</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-300">Verified Member Bonus</span>
                <span className="font-bold text-blue-400">+25 pts</span>
              </div>
            </div>
          </div>

          <Link
            href="/complaints"
            className="text-center py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
          >
            Report an Issue to Earn Points →
          </Link>
        </div>
      </div>

      {/* Errors & Success Feedback */}
      {purchaseError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{purchaseError}</span>
        </div>
      )}

      {justPurchasedCoupon && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-3">
          <div className="flex items-center justify-between font-bold text-sm text-emerald-400">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Coupon Generated Successfully!</span>
            </span>
            <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-xs">
              {justPurchasedCoupon.couponCode}
            </span>
          </div>
          <p className="text-slate-300 text-xs">
            Your single-use voucher for <strong>{justPurchasedCoupon.title}</strong> is active. Present the code or QR below at the cafeteria POS counter to redeem.
          </p>
        </div>
      )}

      {/* Canteen Voucher Store Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Coffee className="w-4 h-4 text-orange-400" />
              <span>Approved Campus Canteen Vouchers</span>
            </h2>
            <p className="text-xs text-slate-400">Instant single-use vouchers redeemable at the Central Cafeteria & Co-Op Store</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {catalog.map((item) => {
            const canAfford = (wallet?.balance || 0) >= item.pointsCost;
            const isProcessing = purchasingItemId === item.id;

            return (
              <div
                key={item.id}
                className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    {getCatalogIcon(item.icon)}
                  </div>
                  <h3 className="font-bold text-sm text-white leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Cost</span>
                      <span className="font-extrabold text-blue-400 text-base">{item.pointsCost} pts</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Value</span>
                      <span className="font-bold text-emerald-400 text-sm">₹{item.monetaryValueRupees}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchaseCoupon(item.id)}
                    disabled={!canAfford || isProcessing}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      !canAfford
                        ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {isProcessing ? (
                      <span>Issuing...</span>
                    ) : !canAfford ? (
                      <span>Need {item.pointsCost - (wallet?.balance || 0)} more pts</span>
                    ) : (
                      <>
                        <Gift className="w-3.5 h-3.5" />
                        <span>Redeem Voucher</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Single-Use Coupons */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>My Redeemable Canteen Coupons ({activeCoupons.length})</span>
        </h2>

        {activeCoupons.length === 0 ? (
          <p className="text-xs text-slate-500 glass-card p-6 rounded-2xl text-center">
            No active coupons yet. Redeem any of the food vouchers above using your civic points!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCoupons.map((cpn) => (
              <div
                key={cpn.id}
                className="p-5 rounded-2xl glass-panel border border-emerald-500/40 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 space-y-4 shadow-lg shadow-emerald-500/5 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Single-Use Active
                    </span>
                    <h3 className="font-bold text-sm text-white mt-1.5">{cpn.title}</h3>
                    <p className="text-xs text-slate-400">Value: ₹{cpn.monetaryValueRupees} discount</p>
                  </div>
                  <div className="w-14 h-14 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-slate-900" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Redemption Code</span>
                    <span className="font-mono font-black text-emerald-400 text-sm tracking-wider">
                      {cpn.couponCode}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Expires: {new Date(cpn.expiresAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Show this code to the cafeteria operator at the counter for instant POS deduction.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Idempotent Reward Ledger Table */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>Auditable Reward Ledger</span>
        </h2>
        <p className="text-xs text-slate-400">
          Immutable double-entry transaction record with unique idempotency keys preventing duplicate credits or coupon reuse.
        </p>

        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Transaction Description</th>
                  <th className="py-3 px-4">Idempotency Key</th>
                  <th className="py-3 px-4 text-right">Points</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No ledger transactions yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(entry.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{entry.description}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[10px] truncate max-w-[200px]">
                        {entry.idempotencyKey}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          entry.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {entry.amount > 0 ? `+${entry.amount}` : entry.amount} pts
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">
                        {entry.balanceAfter} pts
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
