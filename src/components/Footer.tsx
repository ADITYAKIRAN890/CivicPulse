import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t-[3px] border-black mt-auto py-8 text-black shadow-[0_-4px_0px_#000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="font-black text-base text-black tracking-tight">
                Civics<span className="bg-[#38BDF8] px-1 py-0.2 rounded border border-black ml-0.5">Pulse</span> Smart Campus
              </p>
              <p className="text-xs font-semibold text-neutral-700">
                Built for zero-budget college hackathon · ₹0 Total Cost Architecture
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="inline-flex items-center space-x-1.5 bg-[#A3E635] border-2 border-black shadow-[2px_2px_0px_#000] px-2.5 py-1 rounded font-bold text-black">
              <ShieldCheck className="w-3.5 h-3.5 text-black" />
              <span>Full PostgreSQL RLS</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-[#38BDF8] border-2 border-black shadow-[2px_2px_0px_#000] px-2.5 py-1 rounded font-bold text-black">
              <HeartHandshake className="w-3.5 h-3.5 text-black" />
              <span>Free Tier / Local Fallback</span>
            </span>
            <Link href="/appointments" className="font-bold text-black hover:bg-[#FFE600] border border-black bg-[#FAF7EE] px-2.5 py-1 rounded shadow-[2px_2px_0px_#000] transition">
              Doctor Care
            </Link>
            <Link href="/complaints" className="font-bold text-black hover:bg-[#FB7185] border border-black bg-[#FAF7EE] px-2.5 py-1 rounded shadow-[2px_2px_0px_#000] transition">
              Complaints
            </Link>
            <Link href="/rewards" className="font-bold text-black hover:bg-[#A3E635] border border-black bg-[#FAF7EE] px-2.5 py-1 rounded shadow-[2px_2px_0px_#000] transition">
              Canteen Coupons
            </Link>
            <Link href="/people" className="font-bold text-black hover:bg-[#C084FC] border border-black bg-[#FAF7EE] px-2.5 py-1 rounded shadow-[2px_2px_0px_#000] transition">
              People DB
            </Link>
          </div>

          <div className="text-xs font-bold text-neutral-800 bg-[#FAF7EE] border-2 border-black shadow-[2px_2px_0px_#000] px-3 py-1.5 rounded">
            <span>Academic Term 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

