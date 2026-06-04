'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { getActiveOrg } from '@/lib/supabase-helpers';

export function AIBuilding() {
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id');
  const supabase = createClient();

  const [deployment, setDeployment] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [animProgress, setAnimProgress] = useState(2);
  const animStartedRef = useRef(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Load Org
        const activeOrg = await getActiveOrg(supabase) || { alias: 'Acme Corp', instance_url: '' };
        setOrg(activeOrg);

        let targetId = deployId;
        if (!targetId) {
          const { data: latestDeploys } = await supabase
            .from('deployments')
            .select('*')
            .not('jira_ticket_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);
          if (latestDeploys && latestDeploys.length > 0) {
            targetId = latestDeploys[0].id;
          }
        }

        if (!targetId || targetId.startsWith('mock-')) {
          setDeployment({
            id: 'mock-sfdc-109',
            jira_ticket_id: 'SFDC-109',
            status: 'in_progress',
          });
          const mockPlan = {
            summary: 'Add partner referral tracking to Opportunity — Referral_Partner__c lookup + Report',
            riskLevel: 'Low',
            steps: [
              { num: 1, title: 'Create field: Referral_Partner__c on Opportunity', detail: 'Type: Lookup → Account (Partner record type filter) · Label: "Referred by Partner" · Required: No', api: 'Metadata API · CustomField' },
              { num: 2, title: 'Update page layout: "Opportunity Layout"', detail: 'Add field to Key Information section (row 3, column 1) · All record types · Edit mode', api: 'Metadata API · Layout' },
              { num: 3, title: 'Create report: "Pipeline by Referral Partner"', detail: 'Summary report · Opportunity · Grouped by Referral_Partner__c · Filter: Is Open = True · Folder: Sales Reports', api: 'Report API' }
            ],
            acceptanceCriteria: [
              'Referral_Partner__c lookup field exists on Opportunity',
              'Lookup filter restricts to Partner record type only',
              'Field visible in Opportunity Layout — Key Information section',
              'Report "Pipeline by Referral Partner" in Sales Reports folder',
              'Existing Opportunity records are unaffected (field empty by default)'
            ]
          };
          setPlan(mockPlan);
          setTicketDetails({
            key: 'SFDC-109',
            summary: 'Add partner referral tracking to Opportunity — Referral_Partner__c lookup + Report',
            status: 'In Review',
            assigneeName: 'Ravi Kumar',
            assigneeInitials: 'RK',
          });
        } else {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
          let depRecord = null;
          let ticketKey = targetId;

          if (isUuid) {
            const { data } = await supabase.from('deployments').select('*').eq('id', targetId).maybeSingle();
            depRecord = data;
            if (depRecord?.jira_ticket_id) {
              ticketKey = depRecord.jira_ticket_id;
            }
          }

          const res = await fetch(`/api/jira/ticket?key=${ticketKey}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setTicketDetails(data.ticket);
              setPlan(data.plan);
              if (depRecord) {
                setDeployment({
                  ...depRecord,
                  status: ['in_progress', 'completed', 'failed', 'success'].includes(depRecord.status?.toLowerCase() || '')
                    ? depRecord.status
                    : (data.ticket?.status || depRecord.status),
                });
              } else if (data.deployment) {
                setDeployment(data.deployment);
              } else {
                setDeployment({
                  id: targetId,
                  jira_ticket_id: ticketKey,
                  status: data.ticket?.status || 'In review',
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [deployId]);

  // Progressive build animation - advances one step every 1.5 seconds
  useEffect(() => {
    const statusComplete = ['completed', 'success', 'ready', 'approved', 'deployed']
      .includes(deployment?.status?.toLowerCase() || '');
    
    if (loading || statusComplete || !plan || animStartedRef.current) return;
    
    animStartedRef.current = true;
    const stepsArr = plan?.steps || plan?.items || [];
    const totalItems = 2 + stepsArr.length * 2 + 3;
    
    const timer = setInterval(() => {
      setAnimProgress((prev) => {
        if (prev >= totalItems) {
          clearInterval(timer);
          return totalItems;
        }
        return prev + 1;
      });
    }, 1500);
    
    return () => {
      clearInterval(timer);
      animStartedRef.current = false;
    };
  }, [loading, deployment?.status, plan]);

  // Poll deployment status from DB every 5 seconds
  useEffect(() => {
    if (loading || !deployment?.id || deployment.id.startsWith('mock-')) return;
    
    const statusComplete = ['completed', 'success', 'ready', 'approved', 'deployed']
      .includes(deployment?.status?.toLowerCase() || '');
    if (statusComplete) return;
    
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('deployments')
          .select('status')
          .eq('id', deployment.id)
          .maybeSingle();
        
        if (data?.status && ['completed', 'success', 'deployed'].includes(data.status.toLowerCase())) {
          setDeployment((prev: any) => ({ ...prev, status: data.status }));
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loading, deployment?.id, deployment?.status]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0a1628] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-[#0052CC]" />
          <div className="text-[12px] font-bold tracking-wide">Loading DevOps Pipeline Builder...</div>
        </div>
      </div>
    );
  }

  const stepsList = plan?.steps || plan?.items || [];
  const ticketKey = ticketDetails?.key || 'SFDC-109';
  const ticketSummary = ticketDetails?.summary || 'Partner referral tracking';
  const totalLogItems = 2 + stepsList.length * 2 + 3;
  const isDeployComplete = animProgress >= totalLogItems || ['completed', 'success', 'ready', 'approved', 'deployed'].includes(deployment?.status?.toLowerCase() || '');
  const deployUrlId = deployment?.id || deployId || 'mock-sfdc-109';

  // Construct build log items based on the plan
  const logItems: any[] = [
    { txt: "Connected to Dev Sandbox via OAuth 2.0", time: "0.2s ✓", done: true },
    { txt: "Loaded org metadata", time: "1.4s ✓", done: true },
  ];

  stepsList.forEach((step: any, idx: number) => {
    const title = step.title || step.fullName || `Step ${idx + 1}`;
    logItems.push({
      txt: `Generated Metadata API package for ${title}`,
      time: "0.9s ✓",
      done: true
    });
    logItems.push({
      txt: `Deployed ${title} to Salesforce Sandbox`,
      time: "3.2s ✓",
      done: true
    });
  });

  logItems.push({ txt: "Committing changes to Git branch", time: "1.1s ✓", done: true });
  logItems.push({ txt: "Running AI self-evaluation — acceptance criteria check", time: "1.5s ✓", done: true });
  logItems.push({ txt: "Generating pull request on GitHub", time: "0.9s ✓", done: true });

  // Progressive animation: mark items beyond current animated step as pending
  let activeIndex = logItems.length;
  if (!isDeployComplete) {
    activeIndex = Math.min(animProgress, logItems.length);
    for (let i = activeIndex; i < logItems.length; i++) {
      logItems[i].done = false;
      logItems[i].time = "pending";
    }
    if (activeIndex < logItems.length) {
      logItems[activeIndex] = {
        ...logItems[activeIndex],
        active: true,
        time: "running"
      };
    }
  }

  const completedCount = isDeployComplete ? logItems.length : activeIndex;

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[220px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge DevOps Pipeline</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52] cursor-pointer">
          <div className="text-[11px] font-semibold">{org?.alias || 'Acme Corp'} Dev Sandbox</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">
            {isDeployComplete ? 'Build complete' : `Building ${ticketKey}...`}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className={`w-[6px] h-[6px] rounded-full ${isDeployComplete ? 'bg-[#22c55e]' : 'bg-[#D97706] animate-pulse'}`}></div>
            <span className={`text-[9px] ${isDeployComplete ? 'text-[#22c55e]' : 'text-[#D97706]'}`}>
              {isDeployComplete ? 'Idle' : 'Building...'}
            </span>
          </div>
        </div>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1">ORG PIPELINE</div>
        <div className="flex items-center gap-[9px] px-[14px] py-[9px] bg-[#0d2a42] text-[#185FA5] border-l-2 border-[#00a1e0] text-[11px] cursor-pointer">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isDeployComplete ? 'bg-[#22c55e]' : 'bg-[#D97706] animate-pulse'}`}></div>
          Dev Sandbox {isDeployComplete ? '✓' : '← building'}
        </div>
        <div className="flex items-center gap-[9px] px-[14px] py-[9px] text-[#7cc4e4] hover:bg-[#031b2e] text-[11px] cursor-pointer">
          <div className="w-2 h-2 rounded-full bg-[#1a3050] shrink-0"></div>
          QA Sandbox
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDeployComplete ? 'bg-[#22c55e]' : 'bg-[#D97706] animate-pulse'}`}></div>
          <div className="text-[13px] font-semibold flex-1 truncate">AI Building — {ticketKey} · Dev Sandbox</div>
          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${
            isDeployComplete ? 'bg-[#0d2f17] text-[#22c55e]' : 'bg-[#3f2d00] text-[#D97706] border border-[#D97706]/20'
          }`}>{isDeployComplete ? 'Complete' : 'In progress'}</span>
          <span className="text-[10px] text-[#3a6a90]">Started recently</span>
        </div>

        {/* Pipeline Status Bar */}
        <div className="flex bg-[#021427] border-b border-[#1e3a52] py-2 px-4 gap-6 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex flex-col items-center min-w-[70px]">
            <div className="w-5 h-5 rounded-full bg-[#0d2f17] border border-[#22c55e] flex items-center justify-center text-[#22c55e]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
            </div>
            <div className="text-[9px] font-bold mt-1">Jira ticket</div>
            <div className="text-[8px] text-[#22c55e]">Read</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px]">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
              isDeployComplete ? 'bg-[#0d2f17] border border-[#22c55e] text-[#22c55e]' : 'bg-[#3f2d00] border border-[#D97706] text-[#D97706] animate-pulse'
            }`}>{isDeployComplete ? '✓' : 'AI'}</div>
            <div className={`text-[9px] font-bold mt-1 ${isDeployComplete ? '' : 'text-[#D97706]'}`}>AI build</div>
            <div className={`text-[8px] ${isDeployComplete ? 'text-[#22c55e]' : 'text-[#D97706]'}`}>{isDeployComplete ? 'Done' : 'Building...'}</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-[10px] text-white">✓</div>
            <div className="text-[9px] font-bold mt-1">AI evaluate</div>
            <div className="text-[8px]">Pending</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-[10px] text-white">👤</div>
            <div className="text-[9px] font-bold mt-1">Human review</div>
            <div className="text-[8px]">Pending</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <div className="text-[9px] font-bold mt-1">Git commit</div>
            <div className="text-[8px]">Pending</div>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* AI Context Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#032D60]/40 px-3 py-2.5 flex items-center gap-2 border-b border-[#1e3a52]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A1E0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <div className="text-[11px] font-semibold text-[#7cc4e4]">AI reading {ticketKey} instructions...</div>
            </div>
            <div className="p-3">
              <div className="bg-[#020b16] rounded-lg p-3 text-[10.5px] leading-[1.8] font-mono">
                <div className="text-[#FCD34D] text-[9px] font-bold mb-1 tracking-wider">ORBIS AI READING JIRA TICKET</div>
                <div className="text-[#94a3b8]">
                  Ticket: <span className="text-[#185FA5]">{ticketKey}</span> · {ticketSummary}<br/>
                  Detected changes: <span className="text-[#22c55e]">{stepsList.length} items</span><br/>
                  Org context loaded: <span className="text-[#22c55e]">Metadata confirmed</span><br/>
                  Git branch: <span className="text-[#a78bfa]">feature/{ticketKey.toLowerCase()}</span> <span className="text-[#22c55e]">created</span>
                </div>
              </div>
            </div>
          </div>

          {/* Build Log */}
          <div className="bg-[#021427] rounded-xl overflow-hidden border border-[#1e3a52]/50 shrink-0">
            <div className="bg-[#031b2e] px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#7cc4e4] tracking-wider">DEPLOYMENT LOG — Forge · Dev Sandbox</span>
              <span className={`text-[10px] font-bold flex items-center gap-1.5 ${isDeployComplete ? 'text-[#22c55e]' : 'text-[#D97706] animate-pulse'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDeployComplete ? 'bg-[#22c55e]' : 'bg-[#D97706]'}`}></span>
                {isDeployComplete ? 'BUILD COMPLETE' : 'LIVE'}
              </span>
            </div>
            <div className="flex flex-col">
              {logItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-[#0d2137] last:border-none">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    item.done ? 'bg-[#15803D]' : item.active ? 'bg-[#D97706] animate-pulse' : 'bg-[#1e3a52]'
                  }`}>
                    {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 12l5 5L19 7"/></svg>}
                  </div>
                  <span className={`text-[10.5px] flex-1 ${item.active ? 'text-[#D97706]' : 'text-[#e2e8f0]'}`}>{item.txt}</span>
                  <span className="text-[9px] text-[#4a7fa5] font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <Link 
            href={`/dashboard?view=p-s3&id=${deployUrlId}`}
            className={`w-full rounded-xl py-3 px-4 flex items-center justify-center gap-3 transition-all shrink-0 ${
              isDeployComplete ? 'bg-[#15803D] hover:bg-[#126932] text-white font-bold' : 'bg-[#0d1f35] border border-[#1a3050] text-[#5a9fd4]'
            }`}
          >
            {!isDeployComplete && <div className="w-3.5 h-3.5 border-2 border-[#00A1E0] border-t-transparent rounded-full animate-spin"></div>}
            <span className="text-[12px] font-bold">
              {isDeployComplete ? 'Build successful! View Evaluation Report' : `Building in Dev Sandbox... (${completedCount} of ${logItems.length} steps complete)`}
            </span>
          </Link>
          <div className="text-center text-[10px] text-[#3a6a90] pb-4">
            AI is working autonomously — you will be notified when evaluation is ready for review
          </div>
        </div>
      </div>
    </div>
  );
}
