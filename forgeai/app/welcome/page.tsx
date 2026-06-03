'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Zap, KanbanSquare } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/onboarding');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#020817] text-white px-6 overflow-hidden relative">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[360px] h-[360px] bg-[#00a1e0]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[580px] flex flex-col items-center text-center gap-8 z-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        
        {/* Logo and Tagline */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(47,129,247,0.15)] animate-bounce duration-[3000ms]">
            <Sparkles className="w-8 h-8 text-[#00a1e0]" />
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <h1 className="text-[48px] font-black tracking-tighter bg-gradient-to-r from-white via-white to-primary/80 bg-clip-text text-transparent leading-none">
              Forge AI
            </h1>
            <span className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-extrabold">
              The AI Salesforce Builder
            </span>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
          <div className="p-4 bg-[#0b1120] border border-white/5 rounded-2xl flex flex-col items-center text-center gap-2">
            <Zap className="w-5 h-5 text-[#00a1e0]" />
            <span className="text-xs font-bold">Build with AI</span>
            <p className="text-[10px] text-white/40 leading-relaxed font-medium">Describe changes in plain English. AI creates Apex, Flows, and layouts.</p>
          </div>
          <div className="p-4 bg-[#0b1120] border border-white/5 rounded-2xl flex flex-col items-center text-center gap-2">
            <KanbanSquare className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold">Jira Integration</span>
            <p className="text-[10px] text-white/40 leading-relaxed font-medium">Connect board tickets. Automatically draft and execute implementation plans.</p>
          </div>
          <div className="p-4 bg-[#0b1120] border border-white/5 rounded-2xl flex flex-col items-center text-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold">Org Health Guard</span>
            <p className="text-[10px] text-white/40 leading-relaxed font-medium">Scan org metadata automatically, detect code smell, and maintain code quality.</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-3 w-full mt-4">
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-[280px] py-3.5 bg-[#00a1e0] hover:bg-[#008cc2] text-white rounded-xl font-bold text-[14px] shadow-[0_15px_30px_rgba(0,161,224,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <span className="text-[10px] text-white/25 font-medium">
            No keys or complex configuration required.
          </span>
        </div>

      </div>
    </div>
  );
}
