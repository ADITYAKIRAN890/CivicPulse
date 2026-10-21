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
    <div className="space-y-8 pb-12 text-black">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFE600] border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-2xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center space-x-2 bg-black text-white px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000] mb-2">
            <Gift className="w-4 h-4 text-[#FFE600]" />
            <span>Campus Civic Rewards & Single-Use Canteen POS Vouchers</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
            Civic Wallet & Canteen Store
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-neutral-800 mt-1">
            Earn PulsePoints when campus facilities resolve your reported civic issues. Convert points into approved food vouchers.
          </p>
        </div>

        {/* Quick Link to Canteen POS */}
        <Link
          href="/canteen-pos"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#38BDF8] text-black border-2 border-black text-xs font-black shadow-[3px_3px_0px_#000] transition self-start md:self-auto hover:-translate-y-0.5"
        >
          <Coffee className="w-4 h-4 text-black" />
          <span>Switch to Canteen POS Terminal →</span>
        </Link>
      </div>

      {/* Ethical Reward Policy Alert */}
      <div className="p-4 rounded-xl bg-[#A3E635] border-2 border-black shadow-[3.5px_3.5px_0px_#000] flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
        <div className="text-xs text-black font-semibold leading-relaxed">
          <span className="font-black text-black block mb-0.5">Strict Ethical Reward Architecture</span>
          Points are awarded <strong>only</strong> for validated civic milestones (+25 pts on staff triage validation, +50 pts on verified resolution). 
          Doctor appointments, health visits, and medical disclosures are <strong>strictly unrewarded</strong> to safeguard student privacy and prevent gamification.
        </div>
      </div>

      {/* Wallet Balance Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#38BDF8] p-6 sm:p-8 rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_#000] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-black flex items-center space-x-1.5 bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">
              <Award className="w-4 h-4 text-black" />
              <span>CivicsPulse Student Wallet</span>
            </span>
            <span className="text-xs font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-black">
              {currentUser?.fullName} ({currentUser?.rollNumber || 'Student'})
            </span>
          </div>

          <div className="mt-5 flex items-baseline space-x-3">
            <span className="text-5xl sm:text-7xl font-black text-black tracking-tight">
              {loading ? '...' : wallet?.balance || 0}
            </span>
            <span className="text-lg sm:text-2xl font-black text-black uppercase tracking-widest bg-[#FFE600] px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_#000]">
              PulsePoints
            </span>
          </div>

          <div className="mt-6 pt-5 border-t-2 border-black grid grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-3 rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_#000]">
              <span className="text-neutral-700 font-bold block text-[11px]">Lifetime Civic Points Earned</span>
              <span className="text-xl font-black text-black">+{wallet?.lifetimeEarned || 0} pts</span>
            </div>
            <div className="bg-white p-3 rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_#000]">
              <span className="text-neutral-700 font-bold block text-[11px]">Points Redeemed at Canteen</span>
              <span className="text-xl font-black text-black">-{wallet?.lifetimeSpent || 0} pts</span>
            </div>
          </div>
        </div>

        {/* Quick Earn Guide */}
        <div className="bg-white p-6 rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_#000] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-base text-black flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-black" />
              <span>Point Milestones</span>
            </h3>
            <p className="text-xs font-semibold text-neutral-700 mt-1">Earn points solely by helping improve campus infrastructure:</p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7EE] border-2 border-black font-black">
                <span className="text-black">Staff Triage Validation</span>
                <span className="bg-[#A3E635] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">+25 pts</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7EE] border-2 border-black font-black">
                <span className="text-black">Resolved with Evidence</span>
                <span className="bg-[#A3E635] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">+50 pts</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7EE] border-2 border-black font-black">
                <span className="text-black">Verified Member Bonus</span>
                <span className="bg-[#38BDF8] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">+25 pts</span>
              </div>
            </div>
          </div>

          <Link
            href="/complaints"
            className="text-center py-2 px-3 rounded-xl bg-[#FFE600] hover:bg-yellow-300 text-black text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] transition"
          >
            Report an Issue to Earn Points →
          </Link>
        </div>
      </div>

      {/* Errors & Success Feedback */}
      {purchaseError && (
        <div className="p-4 rounded-xl bg-[#FB7185] border-2 border-black shadow-[3px_3px_0px_#000] text-black text-xs flex items-center space-x-2 font-black">
          <AlertCircle className="w-4 h-4 text-black shrink-0" />
          <span>{purchaseError}</span>
        </div>
      )}

      {justPurchasedCoupon && (
        <div className="p-5 rounded-2xl bg-[#A3E635] border-[2.5px] border-black shadow-[4px_4px_0px_#000] text-black text-xs space-y-3">
          <div className="flex items-center justify-between font-black text-sm text-black">
            <span className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-black" />
              <span>Coupon Generated Successfully!</span>
            </span>
            <span className="font-mono bg-white px-2.5 py-1 rounded-md border-2 border-black text-xs shadow-[1.5px_1.5px_0px_#000]">
              {justPurchasedCoupon.couponCode}
            </span>
          </div>
          <p className="text-black font-semibold text-xs">
            Your single-use voucher for <strong>{justPurchasedCoupon.title}</strong> is active. Present the code or QR below at the cafeteria POS counter to redeem.
          </p>
        </div>
      )}

      {/* Canteen Voucher Store Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-black flex items-center space-x-2">
              <Coffee className="w-5 h-5 text-black" />
              <span>Approved Campus Canteen Vouchers</span>
            </h2>
            <p className="text-xs font-semibold text-neutral-700">Instant single-use vouchers redeemable at the Central Cafeteria & Co-Op Store</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {catalog.map((item) => {
            const canAfford = (wallet?.balance || 0) >= item.pointsCost;
            const isProcessing = purchasingItemId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7EE] flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000]">
                    {getCatalogIcon(item.icon)}
                  </div>
                  <h3 className="font-black text-base text-black leading-snug">{item.title}</h3>
                  <p className="text-xs font-semibold text-neutral-700 line-clamp-2">{item.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t-2 border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-600 block">Cost</span>
                      <span className="font-black text-black text-base">{item.pointsCost} pts</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-neutral-600 block">Value</span>
                      <span className="font-black text-black bg-[#A3E635] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] text-xs">₹{item.monetaryValueRupees}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchaseCoupon(item.id)}
                    disabled={!canAfford || isProcessing}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 border-2 border-black shadow-[3px_3px_0px_#000] ${
                      !canAfford
                        ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                        : 'bg-[#FFE600] hover:bg-yellow-300 text-black hover:-translate-y-0.5 active:translate-y-0.5'
                    }`}
                  >
                    {isProcessing ? (
                      <span>Issuing...</span>
                    ) : !canAfford ? (
                      <span>Need {item.pointsCost - (wallet?.balance || 0)} more pts</span>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 text-black" />
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
      <div className="space-y-4 pt-4 border-t-2 border-black">
        <h2 className="text-xl font-black text-black flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-black" />
          <span>My Redeemable Canteen Coupons ({activeCoupons.length})</span>
        </h2>

        {activeCoupons.length === 0 ? (
          <p className="text-xs font-bold text-neutral-600 bg-white p-6 rounded-2xl text-center border-2 border-black shadow-[3px_3px_0px_#000]">
            No active coupons yet. Redeem any of the food vouchers above using your civic points!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCoupons.map((cpn) => (
              <div
                key={cpn.id}
                className="p-5 rounded-2xl bg-[#FEF08A] border-[2.5px] border-black shadow-[5px_5px_0px_#000] space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-black bg-white px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_#000]">
                      Single-Use Active
                    </span>
                    <h3 className="font-black text-base text-black mt-2">{cpn.title}</h3>
                    <p className="text-xs font-bold text-neutral-800">Value: ₹{cpn.monetaryValueRupees} discount</p>
                  </div>
                  <div className="w-14 h-14 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000]">
                    <QrCode className="w-12 h-12 text-black" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-700 block">Redemption Code</span>
                    <span className="font-mono font-black text-black text-base tracking-wider">
                      {cpn.couponCode}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-800">
                    Expires: {new Date(cpn.expiresAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-[11px] font-semibold text-neutral-800 italic">
                  Show this code to the cafeteria operator at the counter for instant POS deduction.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Idempotent Reward Ledger Table */}
      <div className="space-y-4 pt-4 border-t-2 border-black">
        <h2 className="text-xl font-black text-black flex items-center space-x-2">
          <History className="w-5 h-5 text-black" />
          <span>Auditable Reward Ledger</span>
        </h2>
        <p className="text-xs font-semibold text-neutral-700">
          Immutable double-entry transaction record with unique idempotency keys preventing duplicate credits or coupon reuse.
        </p>

        <div className="bg-white rounded-2xl overflow-hidden border-[2.5px] border-black shadow-[5px_5px_0px_#000]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7EE] text-black font-black border-b-2 border-black">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Transaction Description</th>
                  <th className="py-3 px-4">Idempotency Key</th>
                  <th className="py-3 px-4 text-right">Points</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-neutral-200 text-black font-semibold">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-600 font-bold">
                      No ledger transactions yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-yellow-50">
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-700 font-mono text-[11px] font-bold">
                        {new Date(entry.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-black text-black">{entry.description}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600 text-[10px] truncate max-w-[200px]">
                        {entry.idempotencyKey}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          entry.amount > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {entry.amount > 0 ? `+${entry.amount}` : entry.amount} pts
                      </td>
                      <td className="py-3 px-4 text-right font-black text-black">
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

