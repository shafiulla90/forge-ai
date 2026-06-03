'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  GitMerge, 
  KanbanSquare, 
  Activity, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  {
    id: 1,
    title: "Conversational Salesforce Builder",
    subtitle: "Describe your requirement, watch Forge AI implement it.",
    desc: "Use the AI Conversation chat to detail new features. Forge AI automatically plans, generates correct Apex classes, triggers, and Flows, and handles XML formatting for deployment.",
    icon: MessageSquare,
    iconColor: "text-[#00a1e0]",
    bgColor: "bg-[#00a1e0]/10",
    illustration: (
      <div className="flex flex-col gap-2 p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-[9px] text-white/70">
        <div className="text-white/30">// Prompt: Add discount logic to Opportunity</div>
        <div className="text-green-400">trigger OpportunityTrigger on Opportunity (before insert) {"{"}</div>
        <div className="text-white/70">  for (Opportunity opp : Trigger.new) {"{"}</div>
        <div className="text-white/70">    if (opp.Amount &gt; 100000) opp.Discount__c = 10;</div>
        <div className="text-white/70">  {"}"}</div>
        <div className="text-green-400">{"}"}</div>
      </div>
    )
  },
  {
    id: 2,
    title: "Safe Deployments & Rollbacks",
    subtitle: "Deploy to Sandboxes with full test execution and 1-click rollback.",
    desc: "Verify generated code by deploying to Sandboxes or Developer Orgs. Forge AI executes tests automatically and saves the original metadata so you can roll back instantly if validation fails.",
    icon: GitMerge,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-400/10",
    illustration: (
      <div className="flex flex-col gap-2 p-4 bg-black/40 border border-white/5 rounded-xl font-medium text-[10px]">
        <div className="flex justify-between items-center text-white/50 text-[9px] uppercase tracking-wider">
          <span>Deployment #108</span>
          <span className="text-[#3fb950] font-bold">Passed</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
          <span>Deploy OpportunityTrigger.trigger</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
          <span>Execute testOpportunityDiscount... Success (100% cover)</span>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Bi-Directional Jira Connection",
    subtitle: "Streamline workflows from backlog directly to Salesforce.",
    desc: "Map Jira boards to Forge AI. Select an active issue, approve the generated implementation plan, draft PRs automatically, and sync deployment status back to Jira.",
    icon: KanbanSquare,
    iconColor: "text-purple-400",
    bgColor: "bg-purple-400/10",
    illustration: (
      <div className="flex flex-col gap-2.5 p-4 bg-black/40 border border-white/5 rounded-xl text-[10px]">
        <div className="flex justify-between items-center">
          <span className="font-bold text-white/90">EDU-451: Auto Discount</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[8px] font-bold uppercase">IN PROGRESS</span>
        </div>
        <p className="text-white/40 text-[9px]">Implement a 10% discount for Opportunity records over $100k.</p>
        <div className="h-px bg-white/5" />
        <span className="text-[#00a1e0] font-bold text-[8px] uppercase tracking-wider">Linked to PR #24</span>
      </div>
    )
  },
  {
    id: 4,
    title: "Continuous Org Health Checks",
    subtitle: "Maintain clean Salesforce instances automatically.",
    desc: "Audit your organization setup. Detect dead code, unreferenced fields, overly complex Flows, and failing tests, summarizing it into an interactive health dashboard.",
    icon: Activity,
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    illustration: (
      <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Org Health Score</span>
          <span className="text-2xl font-black text-emerald-400">92 / 100</span>
        </div>
        <div className="w-12 h-12 rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400 animate-spin duration-[4000ms]" />
      </div>
    )
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);

  const handleNext = () => {
    if (currentIdx < slides.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      router.push('/setup');
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const activeSlide = slides[currentIdx];
  const Icon = activeSlide.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#020817] text-white px-6 overflow-hidden relative">
      {/* Decorative gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[500px] flex flex-col gap-8 z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Progress dots & Back */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className={cn(
              "flex items-center gap-1 text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider focus:outline-none",
              currentIdx === 0 && "opacity-0 pointer-events-none"
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentIdx ? "w-6 bg-[#00a1e0]" : "w-1.5 bg-white/10"
                )}
              />
            ))}
          </div>

          <button
            onClick={() => router.push('/setup')}
            className="text-[11px] font-bold text-white/30 hover:text-[#00a1e0] transition-colors uppercase tracking-wider focus:outline-none"
          >
            Skip
          </button>
        </div>

        {/* Feature Display Card */}
        <div className="bg-[#0b1120] border border-white/5 rounded-2xl shadow-2xl p-6 min-h-[380px] flex flex-col justify-between transition-all">
          <div className="flex flex-col gap-5">
            {/* Slide Header */}
            <div className="flex gap-4 items-center">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", activeSlide.bgColor)}>
                <Icon className={cn("w-6 h-6", activeSlide.iconColor)} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-extrabold">Step {currentIdx + 1} of {slides.length}</span>
                <h2 className="text-[16px] font-bold text-white tracking-tight leading-tight">{activeSlide.title}</h2>
              </div>
            </div>

            {/* Slide Content */}
            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-xs font-bold text-white/80 leading-normal">{activeSlide.subtitle}</h3>
              <p className="text-[11px] text-white/40 leading-relaxed font-medium">{activeSlide.desc}</p>
            </div>
          </div>

          {/* Interactive Illustration Area */}
          <div className="mt-6">
            <div className="text-[8px] text-white/20 uppercase tracking-wider font-bold mb-1.5">Capabilities Walkthrough</div>
            {activeSlide.illustration}
          </div>
        </div>

        {/* Next / Finish Button */}
        <button
          onClick={handleNext}
          className="w-full py-3.5 bg-[#00a1e0] hover:bg-[#008cc2] text-white rounded-xl font-bold text-[13px] shadow-[0_10px_20px_rgba(0,161,224,0.15)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 group"
        >
          {currentIdx === slides.length - 1 ? (
            <>
              Connect Salesforce Org
              <Check className="w-4 h-4" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>

      </div>
    </div>
  );
}
