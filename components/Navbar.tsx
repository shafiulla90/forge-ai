'use client';

import React, { Suspense } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const groups = [
  {
    name: 'General',
    items: [
      { name: 'SETUP', href: '/dashboard' },
      { name: 'Connect org', href: '/dashboard?view=connect' },
      { name: 'Org health', href: '/dashboard?view=health' },
      { name: 'Settings', href: '/dashboard?view=settings' },
    ]
  },
  {
    name: 'AI',
    items: [
      { name: 'AI IMPLEMENT', isLabel: true },
      { name: 'AI chat', href: '/dashboard?view=chat' },
      { name: 'Review plan', href: '/dashboard?view=plan' },
      { name: 'Deployment', href: '/dashboard?view=deploy' },
      { name: 'Apex builder', href: '/dashboard?view=apex' },
      { name: 'Flow builder', href: '/dashboard?view=flow' },
      { name: 'Metadata', href: '/dashboard?view=meta' },
      { name: 'History', href: '/dashboard?view=history' },
    ]
  },
  {
    name: 'Jira',
    items: [
      { name: 'JIRA', isLabel: true },
      { name: 'Connect Jira', href: '/dashboard?view=jira-connect' },
      { name: 'Post ticket', href: '/dashboard?view=jira-post' },
      { name: 'Board', href: '/dashboard?view=jira-board' },
      { name: 'Approve—Deploy', href: '/dashboard?view=jira-approve' },
    ]
  }
];

const pipeline = [
  { name: 'Jira+Build', color: 'text-[#FCD34D]', href: '/dashboard?view=p-s1' },
  { name: 'AI building', color: 'text-[#FCD34D]', href: '/dashboard?view=p-s2' },
  { name: 'AI eval', color: 'text-[#fbbf24]', href: '/dashboard?view=p-s3' },
  { name: 'Human review', color: 'text-[#FCD34D]', href: '/dashboard?view=p-s4' },
  { name: 'Git + PR', color: 'text-[#c4b5fd]', href: '/dashboard?view=p-s5' },
  { name: 'Org pipeline', color: 'text-[#FCD34D]', href: '/dashboard?view=p-s6' },
  { name: 'Promote org', color: 'text-[#FCD34D]', href: '/dashboard?view=p-s7' },
  { name: 'Full flow', color: 'text-[#FCD34D]', href: '/dashboard?view=p-s8' },
];

function NavbarInner() {
  const searchParams = useSearchParams();
  const currentView = searchParams?.get('view');

  return (
    <div className="w-full flex flex-col bg-[#010409] border-b border-white/5 sticky top-0 z-50">
      {/* Top Main Navbar */}
      <div className="flex items-center h-[44px] px-4 gap-4 overflow-x-auto no-scrollbar">
        <div className="text-[#00a1e0] font-black text-base tracking-tight mr-1 shrink-0">
          Forge
        </div>

        <div className="h-5 w-[1px] bg-white/10 shrink-0" />

        {groups.map((group, gIdx) => (
          <div key={group.name} className="flex items-center gap-1 shrink-0">
            <div className="flex items-center bg-[#0d1117] rounded-md p-0.5 gap-0.5 border border-white/5">
              {group.items.map((item) => {
                const isActive = item.name === 'Connect org' ? currentView === 'connect'
                               : item.name === 'Org health' ? currentView === 'health'
                               : item.name === 'AI chat' ? currentView === 'chat'
                               : item.name === 'Review plan' ? currentView === 'plan'
                               : item.name === 'Deployment' ? currentView === 'deploy'
                               : item.name === 'Apex builder' ? currentView === 'apex'
                               : item.name === 'Flow builder' ? currentView === 'flow'
                               : item.name === 'Metadata' ? currentView === 'meta'
                               : item.name === 'History' ? currentView === 'history'
                               : item.name === 'Settings' ? currentView === 'settings'
                               : item.name === 'Connect Jira' ? currentView === 'jira-connect'
                               : item.name === 'Post ticket' ? currentView === 'jira-post'
                               : item.name === 'Board' ? currentView === 'jira-board'
                               : item.name === 'Approve—Deploy' ? currentView === 'jira-approve'
                               : item.name === 'SETUP' ? !currentView : false;

                if (item.isLabel) {
                  return (
                    <span key={item.name} className="px-2 text-[11px] font-bold text-white/30 uppercase tracking-wider">
                      {item.name}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href || '#'}
                    className={cn(
                      "px-3 py-1.5 rounded text-[12px] font-semibold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-[#00a1e0] text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
            {gIdx !== groups.length - 1 && (
              <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Sub-navbar / Pipeline */}
      <div className="flex items-center h-[34px] px-4 bg-black/20 border-t border-white/5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-[#0d1117] rounded-full px-4 py-1 gap-2 border border-white/5">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] mr-2">DevOps Pipeline</span>
            {pipeline.map((step) => {
              const isActive = currentView === step.href?.split('=')[1];
              const ticketId = searchParams?.get('id');
              const hrefWithId = ticketId ? `${step.href}&id=${ticketId}` : step.href;
              return (
                <Link
                  key={step.name}
                  href={hrefWithId}
                  className={cn(
                    "text-[11px] font-semibold px-3 py-1 rounded-full transition-all whitespace-nowrap hover:opacity-80",
                    isActive ? "bg-[#00a1e0] text-white" : step.color
                  )}
                >
                  {step.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={
      <div className="w-full flex flex-col bg-[#010409] border-b border-white/5 sticky top-0 z-50">
        <div className="h-[44px]" />
        <div className="h-[34px] bg-black/20 border-t border-white/5" />
      </div>
    }>
      <NavbarInner />
    </Suspense>
  );
}
