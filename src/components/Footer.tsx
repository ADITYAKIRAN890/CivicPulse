import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full glass-panel border-t border-slate-800/80 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">
                Civics<span className="text-blue-500">Pulse</span> Smart Campus
              </p>
              <p className="text-xs text-slate-400">
                Built for zero-budget college hackathon · ₹0 Total Cost Architecture
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full PostgreSQL RLS</span>
            </span>
            <span className="flex items-center space-x-1">
              <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
              <span>Free Tier Local/Supabase Fallback</span>
            </span>
            <span className="text-slate-500">·</span>
            <Link href="/appointments" className="hover:text-blue-400 transition">
              Doctor Appointments
            </Link>
            <Link href="/complaints" className="hover:text-blue-400 transition">
              Campus Complaints
            </Link>
            <Link href="/rewards" className="hover:text-blue-400 transition">
              Canteen Coupons
            </Link>
            <Link href="/grievance-portal" className="hover:text-purple-400 transition">
              Confidential Grievance
            </Link>
          </div>

          <div className="text-xs text-slate-500 text-center md:text-right">
            <span>Local Time: 2026 Academic Term</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
