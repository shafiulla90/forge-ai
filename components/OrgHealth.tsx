'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  MessageSquare,
  Database,
  History,
  Plus,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function OrgHealth() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Fetch the first connected Salesforce org
  useEffect(() => {
    fetch('/api/orgs')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOrg(data[0]);
        }
      })
      .catch((err) => console.error('Failed to fetch orgs:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch real-time health data for the active org
  useEffect(() => {
    if (!org?.id) return;
    setHealthLoading(true);
    fetch(`/api/orgs/health?orgId=${org.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setHealthData(data);
        }
      })
      .catch((err) => console.error('Failed to fetch health data:', err))
      .finally(() => setHealthLoading(false));
  }, [org]);

  const orgName = org?.alias ?? org?.instance_url ?? 'Your Org';
  const lastSynced = org?.last_synced_at
    ? new Date(org.last_synced_at).toLocaleTimeString()
    : 'Never';

  // Calculate issue counts
  const totalIssuesCount = healthData 
    ? (healthData.criticalIssues?.length || 0) + (healthData.warnings?.length || 0)
    : 0;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020817]">
      {/* Sidebar */}
      <div className="w-[240px] border-r border-white/5 flex flex-col p-4 gap-5 shrink-0">
        <div className="flex flex-col gap-0.5 px-2">
          <span className="text-[16px] font-black text-white tracking-tight">Forge</span>
          <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">Forge AI Builder</span>
        </div>

        <div className="bg-[#0b1120] border border-white/5 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-bold text-white truncate">{orgName}</span>
            <span className="text-[10px] text-white/35 font-semibold">
              {org?.org_type ?? 'Production'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${org ? 'bg-[#3fb950]' : 'bg-white/20'}`} />
            <span className={`text-[10px] font-bold ${org ? 'text-[#3fb950]' : 'text-white/30'}`}>
              {org ? `Connected · Last synced ${lastSynced}` : 'Not connected'}
            </span>
          </div>
        </div>

        <Link href="/dashboard?view=chat" className="w-full py-2.5 bg-[#00a1e0] hover:bg-[#008cc2] text-white rounded-lg font-bold text-[12px] shadow-lg transition-all flex items-center justify-center gap-2 group">
          <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
          + New conversation
        </Link>

        <div className="flex flex-col gap-3 mt-1">
          <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] px-2">Workspace</span>
          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1e293b] text-white text-[13px] font-semibold transition-all">
              <Activity className="w-4 h-4 text-[#00a1e0]" />
              Org health check
            </button>
            <Link href="/dashboard?view=chat" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-white/40 hover:bg-white/5 text-[13px] font-semibold transition-all">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                AI conversations
              </div>
              <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white/30">3</span>
            </Link>
            <Link href="/dashboard?view=meta" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:bg-white/5 text-[13px] font-semibold transition-all">
              <Database className="w-4 h-4" />
              Metadata explorer
            </Link>
            <Link href="/dashboard?view=history" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:bg-white/5 text-[13px] font-semibold transition-all">
              <History className="w-4 h-4" />
              Deployment history
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 sticky top-0 bg-[#020817]/80 backdrop-blur-md z-10 border-b border-white/5">
          <h2 className="text-[14px] font-bold text-white tracking-tight">
            Org Health Check — {orgName}
          </h2>
          <div className="flex items-center gap-3">
            {!healthLoading && healthData && totalIssuesCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#3f0d0d] border border-red-500/10 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
                <span className="text-[9.5px] font-bold text-[#f87171] uppercase tracking-wider">
                  {totalIssuesCount} issues found
                </span>
              </div>
            )}
            <Link href="/dashboard?view=chat" className="px-4 py-2 bg-[#00a1e0] hover:bg-[#008cc2] text-white rounded-lg font-bold text-[12px] flex items-center gap-2 transition-all">
              <Zap className="w-3.5 h-3.5" />
              Fix with AI →
            </Link>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 bg-[#0a1628] min-h-full">
          {/* Loading state skeletons */}
          {(loading || healthLoading) && (
            <div className="flex flex-col gap-6 animate-pulse">
              {/* Skeletons for the 6 cards */}
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-4 h-24 flex flex-col gap-2">
                    <div className="h-6 w-1/3 bg-white/5 rounded" />
                    <div className="h-3 w-1/2 bg-white/5 rounded" />
                    <div className="h-4 w-1/4 bg-white/5 rounded mt-auto" />
                  </div>
                ))}
              </div>
              
              {/* Skeletons for Critical Issues */}
              <div className="flex flex-col gap-3">
                <div className="h-4 w-1/4 bg-white/5 rounded" />
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-[#0d2137] rounded-xl p-4 h-20 border border-white/5" />
                ))}
              </div>
            </div>
          )}

          {/* No org connected */}
          {!loading && !org && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-white/20 text-[13px] font-semibold">No Salesforce org connected</span>
              <span className="text-white/10 text-[11px]">Connect an org to see live health data</span>
            </div>
          )}

          {/* Metrics Grid */}
          {!loading && !healthLoading && healthData && (
            <div className="grid grid-cols-2 gap-[10px]">
              {/* 1. Unused custom fields */}
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-3.5 flex flex-col gap-1 relative group hover:border-[#1e3a52]/80 transition-all">
                <span className="text-[22px] font-bold text-[#f87171] leading-none">
                  {healthData.metrics.unusedFields}
                </span>
                <span className="text-[9.5px] text-[#4a7fa5] font-medium leading-tight">Unused custom fields</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mt-1.5 bg-[#3f0d0d] text-[#f87171]">
                  High priority
                </span>
              </div>

              {/* 2. SOQL in Apex loops */}
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-3.5 flex flex-col gap-1 relative group hover:border-[#1e3a52]/80 transition-all">
                <span className="text-[22px] font-bold text-[#f87171] leading-none">
                  {healthData.metrics.soqlLoops}
                </span>
                <span className="text-[9.5px] text-[#4a7fa5] font-medium leading-tight">SOQL in Apex loops</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mt-1.5 bg-[#3f0d0d] text-[#f87171]">
                  Governor risk
                </span>
              </div>

              {/* 3. Apex test coverage */}
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-3.5 flex flex-col gap-1 relative group hover:border-[#1e3a52]/80 transition-all">
                <span className="text-[22px] font-bold text-[#FCD34D] leading-none">
                  {healthData.metrics.apexCoverage}%
                </span>
                <span className="text-[9.5px] text-[#4a7fa5] font-medium leading-tight">Apex test coverage</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mt-1.5 bg-[#3f2d00] text-[#FCD34D]">
                  Below 75%
                </span>
              </div>

              {/* 4. Inactive Flows */}
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-3.5 flex flex-col gap-1 relative group hover:border-[#1e3a52]/80 transition-all">
                <span className="text-[22px] font-bold text-[#FCD34D] leading-none">
                  {healthData.metrics.inactiveFlows}
                </span>
                <span className="text-[9.5px] text-[#4a7fa5] font-medium leading-tight">Inactive Flows</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mt-1.5 bg-[#3f2d00] text-[#FCD34D]">
                  Metadata bloat
                </span>
              </div>

              {/* 5. Profiles with full access */}
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-3.5 flex flex-col gap-1 relative group hover:border-[#1e3a52]/80 transition-all">
                <span className="text-[22px] font-bold text-[#FCD34D] leading-none">
                  {healthData.metrics.fullAccessProfiles}
                </span>
                <span className="text-[9.5px] text-[#4a7fa5] font-medium leading-tight">Profiles with full access</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mt-1.5 bg-[#3f2d00] text-[#FCD34D]">
                  Security risk
                </span>
              </div>

              {/* 6. Flow best practice */}
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-xl p-3.5 flex flex-col gap-1 relative group hover:border-[#1e3a52]/80 transition-all">
                <span className="text-[22px] font-bold text-[#4ade80] leading-none">
                  {healthData.metrics.flowBestPractice}%
                </span>
                <span className="text-[9.5px] text-[#4a7fa5] font-medium leading-tight">Flow best practice</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mt-1.5 bg-[#0d2f17] text-[#4ade80]">
                  Good
                </span>
              </div>
            </div>
          )}

          {/* Critical Issues List */}
          {!loading && !healthLoading && healthData && healthData.criticalIssues?.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-[#f87171] uppercase tracking-[0.2em] px-0.5">
                  CRITICAL ISSUES — FIX FIRST
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {healthData.criticalIssues.map((issue: any, index: number) => (
                  <div 
                    key={index} 
                    className="bg-[#0d2137] rounded-lg p-3 flex gap-3 border-l-[3px] border-l-[#f87171] hover:border-[#1e3a52] transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-bold text-[#e2e8f0] tracking-tight">
                          {issue.title}
                        </h3>
                      </div>
                      <p className="text-[10px] text-[#4a7fa5] leading-normal mt-0.5">
                        {issue.desc}
                      </p>
                      <Link 
                        href="/dashboard?view=chat" 
                        className="text-[9px] text-[#00A1E0] hover:underline mt-1 font-bold inline-block"
                      >
                        {issue.fix}
                      </Link>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit h-fit mt-0.5 bg-[#3f0d0d] text-[#f87171] shrink-0">
                      {issue.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings List */}
          {!loading && !healthLoading && healthData && healthData.warnings?.length > 0 && (
            <div className="flex flex-col gap-4 mt-2 mb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-[#FCD34D] uppercase tracking-[0.2em] px-0.5">
                  WARNINGS — FIX BEFORE NEXT RELEASE
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {healthData.warnings.map((issue: any, index: number) => (
                  <div 
                    key={index} 
                    className="bg-[#0d2137] rounded-lg p-3 flex gap-3 border-l-[3px] border-l-[#FCD34D] hover:border-[#1e3a52] transition-all"
                  >
                    <div className="flex-1">
                      <h3 className="text-[11px] font-bold text-[#e2e8f0] tracking-tight">
                        {issue.title}
                      </h3>
                      <p className="text-[10px] text-[#4a7fa5] leading-normal mt-0.5">
                        {issue.desc}
                      </p>
                      <Link 
                        href="/dashboard?view=chat" 
                        className="text-[9px] text-[#00A1E0] hover:underline mt-1 font-bold inline-block"
                      >
                        {issue.fix}
                      </Link>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit h-fit mt-0.5 bg-[#3f2d00] text-[#FCD34D] shrink-0">
                      {issue.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
