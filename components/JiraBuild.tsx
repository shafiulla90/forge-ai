'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { getActiveOrg, getCurrentUser, getAllOrgs } from '@/lib/supabase-helpers';

export function JiraBuild() {
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id');
  const supabase = createClient();

  const [deployment, setDeployment] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [todoTickets, setTodoTickets] = useState<any[]>([]);
  const [reviewTickets, setReviewTickets] = useState<any[]>([]);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load Jira Board columns from cache for instant sidebar rendering
        if (typeof window !== 'undefined') {
          const cachedBoard = sessionStorage.getItem('forge_jira_board');
          if (cachedBoard) {
            try {
              const boardData = JSON.parse(cachedBoard);
              if (boardData.columns) {
                setTodoTickets(boardData.columns.todo || []);
                setReviewTickets(boardData.columns.review || []);
              }
            } catch (e) {}
          }
        }

        const user = await getCurrentUser(supabase);
        let orgs: any[] = [];
        if (user) {
          orgs = await getAllOrgs(supabase);
        }
        setAllOrgs(orgs);
        const activeOrg = await getActiveOrg(supabase) || 
          orgs.find(o => {
            const aliasLower = o.alias?.toLowerCase() || '';
            const urlLower = o.instance_url?.toLowerCase() || '';
            return !aliasLower.includes('qa') && 
                   !aliasLower.includes('shafi') && 
                   !aliasLower.includes('uat') && 
                   !aliasLower.includes('prod') &&
                   !urlLower.includes('qa') && 
                   !urlLower.includes('shafi') && 
                   !urlLower.includes('uat') &&
                   !urlLower.includes('prod') &&
                   o.org_type !== 'production';
          }) || 
          (orgs.length > 0 ? orgs[0] : { alias: 'Acme Corp', instance_url: '' });
        setOrg(activeOrg);

        // Fetch Jira Board columns in background
        fetch('/api/jira/board').then(async (boardRes) => {
          if (boardRes.ok) {
            const boardData = await boardRes.json();
            if (boardData.success && boardData.columns) {
              setTodoTickets(boardData.columns.todo || []);
              setReviewTickets(boardData.columns.review || []);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('forge_jira_board', JSON.stringify(boardData));
              }
            }
          }
        }).catch((boardErr) => {
          console.error('Failed to load board data in sidebar:', boardErr);
        });

        let targetId = deployId;
        if (!targetId) {
          // Find latest deployment with jira_ticket_id
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
          // Fallback to mock data
          setDeployment({
            id: 'mock-sfdc-109',
            jira_ticket_id: 'SFDC-109',
            status: 'In review',
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
            description: 'Sales team needs to track which partner account referred each Opportunity. Partners are already stored as Account records with the "Partner" record type. The field must filter to Partner record type only. A report showing pipeline by referring partner is also needed.',
            status: 'In Review',
            priority: 'Medium',
            assigneeName: 'Ravi Kumar',
            assigneeInitials: 'RK',
            created: new Date().toISOString(),
          });
        } else {
          // UUID or Ticket Key
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
                  status: data.ticket?.status || depRecord.status,
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
            } else {
              setError(data.error || 'Failed to retrieve ticket details');
            }
          } else {
            const errData = await res.json().catch(() => ({ error: 'Jira API connection error' }));
            setError(errData.error || 'Jira API connection error');
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
  const acceptanceCriteria = plan?.acceptanceCriteria || plan?.criteria || [];
  const ticketKey = ticketDetails?.key || 'SFDC-109';
  const ticketSummary = ticketDetails?.summary || 'Partner referral tracking';
  const ticketDesc = ticketDetails?.description || 'No description provided';
  const ticketStatus = ticketDetails?.status || 'In Review';
  const deployUrlId = deployment?.id || deployId || 'mock-sfdc-109';

  const qaOrg = allOrgs.find(o => 
    o.alias?.toLowerCase().includes('qa') || 
    o.instance_url?.toLowerCase().includes('qa') || 
    o.alias?.toLowerCase().includes('shafi') || 
    o.instance_url?.toLowerCase().includes('shafi')
  );

  const uatOrg = allOrgs.find(o => 
    o.alias?.toLowerCase().includes('uat') || 
    o.instance_url?.toLowerCase().includes('uat')
  );

  const devOrg = allOrgs.find(o => {
    const aliasLower = o.alias?.toLowerCase() || '';
    const urlLower = o.instance_url?.toLowerCase() || '';
    return !aliasLower.includes('qa') && 
           !aliasLower.includes('shafi') && 
           !aliasLower.includes('uat') && 
           !aliasLower.includes('prod') &&
           !urlLower.includes('qa') && 
           !urlLower.includes('shafi') && 
           !urlLower.includes('uat') &&
           !urlLower.includes('prod') &&
           o.org_type !== 'production';
  }) || org;

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[220px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge DevOps Pipeline</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52] cursor-pointer">
          <div className="text-[11px] font-semibold">{devOrg?.alias || 'Acme Corp'}</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Dev Sandbox · Connected</div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-[6px] h-[6px] rounded-full bg-[#22c55e]"></div>
            <span className="text-[9px] text-[#22c55e]">Connected</span>
          </div>
        </div>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1">LINKED JIRA</div>
        
        {/* TO DO Group */}
        <div className="px-[14px] py-[4px] text-[8px] font-extrabold text-[#4a7fa5]/70 tracking-wider mt-1 uppercase select-none">TO DO</div>
        {todoTickets.map((t: any) => {
          const isActive = t.key === ticketKey;
          return (
            <Link
              key={t.key}
              href={`/dashboard?view=p-s1&id=${t.key}`}
              className={`flex items-center gap-[9px] px-[14px] py-[8px] text-[11px] cursor-pointer transition-all ${
                isActive 
                  ? 'bg-[#0d2a42] text-[#00a1e0] border-l-2 border-[#00a1e0] font-bold font-mono' 
                  : 'text-[#7cc4e4] hover:bg-[#031b2e] font-mono'
              }`}
              title={t.title}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="truncate">{t.key}: {t.title}</span>
            </Link>
          );
        })}
        {todoTickets.length === 0 && (
          <div className="px-[14px] py-[4px] text-[9.5px] text-[#4a7fa5]/40 italic">No tickets in To Do</div>
        )}

        {/* IN REVIEW Group */}
        <div className="px-[14px] py-[4px] text-[8px] font-extrabold text-[#4a7fa5]/70 tracking-wider mt-1 uppercase select-none">IN REVIEW</div>
        {reviewTickets.map((t: any) => {
          const isActive = t.key === ticketKey;
          return (
            <Link
              key={t.key}
              href={`/dashboard?view=p-s1&id=${t.key}`}
              className={`flex items-center gap-[9px] px-[14px] py-[8px] text-[11px] cursor-pointer transition-all ${
                isActive 
                  ? 'bg-[#0d2a42] text-[#00a1e0] border-l-2 border-[#00a1e0] font-bold font-mono' 
                  : 'text-[#7cc4e4] hover:bg-[#031b2e] font-mono'
              }`}
              title={t.title}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="truncate">{t.key}: {t.title}</span>
            </Link>
          );
        })}
        {reviewTickets.length === 0 && (
          <div className="px-[14px] py-[4px] text-[9.5px] text-[#4a7fa5]/40 italic">No tickets in Review</div>
        )}

        <Link href="/dashboard?view=jira-board" className="flex items-center gap-[9px] px-[14px] py-[9px] text-[#7cc4e4] hover:bg-[#031b2e] text-[11px] cursor-pointer border-t border-[#1e3a52]/40 mt-1 pt-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a9fd4" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          Jira board
        </Link>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1">ORG PIPELINE</div>
        
        {/* Dev Sandbox */}
        <div className="flex items-center gap-[9px] px-[14px] py-[9px] text-[#7cc4e4] hover:bg-[#031b2e] text-[11px] cursor-pointer">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
          {devOrg?.alias || 'Dev Sandbox'}
        </div>

        {/* QA Sandbox */}
        {qaOrg ? (
          <div className="flex flex-col gap-0.5 px-[14px] py-[6px] text-[11px] bg-[#0d2a42]/30 border-l-2 border-[#D97706]/40">
            <div className="flex items-center gap-[9px] text-[#22c55e]">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
              QA: {qaOrg.alias}
            </div>
            <span className="text-[8px] text-[#4a7fa5] pl-[17px]">✓ Connected</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-[14px] py-[6px] text-[11px]">
            <div className="flex items-center gap-[9px] text-[#7cc4e4] opacity-55">
              <div className="w-2 h-2 rounded-full bg-[#1a3050]"></div>
              QA Sandbox
            </div>
            <Link href="/dashboard?view=connect&stage=qa" className="text-[8.5px] text-[#00a1e0] hover:underline pl-[17px] font-bold tracking-wide">
              + CONNECT QA SANDBOX
            </Link>
          </div>
        )}

        {/* UAT Sandbox */}
        {uatOrg ? (
          <div className="flex flex-col gap-0.5 px-[14px] py-[6px] text-[11px] bg-[#0d2a42]/30 border-l-2 border-[#3a6a90]/40">
            <div className="flex items-center gap-[9px] text-[#22c55e]">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
              UAT: {uatOrg.alias}
            </div>
            <span className="text-[8px] text-[#4a7fa5] pl-[17px]">✓ Connected</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-[14px] py-[6px] text-[11px]">
            <div className="flex items-center gap-[9px] text-[#7cc4e4] opacity-55">
              <div className="w-2 h-2 rounded-full bg-[#1a3050]"></div>
              UAT Sandbox
            </div>
            <Link href="/dashboard?view=connect&stage=uat" className="text-[8.5px] text-[#00a1e0] hover:underline pl-[17px] font-bold tracking-wide">
              + CONNECT UAT SANDBOX
            </Link>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className="w-2.5 h-2.5 bg-[#0052CC] rounded-sm shrink-0"></div>
          <div className="text-[13px] font-semibold flex-1 truncate">{ticketKey} — {ticketSummary}</div>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0052CC] text-white font-bold">{ticketStatus}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#3f2d00] text-[#FCD34D] font-bold border border-[#D97706]/20">Awaiting build</span>
        </div>

        {/* Pipeline Status Bar */}
        <div className="flex bg-[#021427] border-b border-[#1e3a52] py-2 px-4 gap-6 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex flex-col items-center min-w-[70px]">
            <div className="w-5 h-5 rounded-full bg-[#0d2f17] border border-[#22c55e] flex items-center justify-center text-[#22c55e]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
            </div>
            <div className="text-[9px] font-bold mt-1">Jira ticket</div>
            <div className="text-[8px] text-[#22c55e]">Written</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px]">
            <div className="w-5 h-5 rounded-full bg-[#0d2137] border border-[#00A1E0] flex items-center justify-center text-[8px] font-bold text-[#00A1E0]">AI</div>
            <div className="text-[9px] font-bold mt-1">AI build</div>
            <div className="text-[8px] text-[#185FA5]">Next step</div>
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
        {error ? (
          <div className="flex-1 flex items-center justify-center bg-[#050b16] p-6 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-red-500/10 opacity-10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="relative backdrop-blur-xl bg-[#0d2137]/65 border border-red-500/20 rounded-[28px] p-10 max-w-[480px] text-center shadow-2xl flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/30 flex items-center justify-center shadow-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="animate-bounce">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-[20px] font-black tracking-tight text-white select-none">Jira Connection Error</h2>
                <p className="text-[12.5px] text-[#7ea5c9] leading-relaxed max-w-[380px] select-none">
                  {error.includes('Unauthorized') || error.includes('Forbidden') || error.includes('refresh') 
                    ? 'Your Jira authorization token has expired or is invalid. Please reconnect your Jira account.' 
                    : error}
                </p>
              </div>

              <Link 
                href="/dashboard?view=jira-connect" 
                className="mt-2 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-extrabold text-[11.5px] rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/25 hover:shadow-red-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-widest"
              >
                Reconnect Jira Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Jira Ticket Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden flex flex-col shrink-0">
            <div className="bg-[#032D60] p-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-[11px] font-mono font-bold text-white opacity-80">{ticketKey}</span>
              <span className="text-[12px] font-bold text-white flex-1 truncate">{ticketSummary}</span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-white/15 text-white font-bold whitespace-nowrap">{ticketDetails?.issueType || 'Story'} · {ticketDetails?.points || '1'} pt</span>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-1">DESCRIPTION</div>
                <div className="text-[11px] leading-relaxed text-[#e2e8f0]">
                  {ticketDesc}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-2">SALESFORCE CHANGES REQUIRED</div>
                <div className="bg-[#091526] rounded-lg overflow-hidden border border-[#1e3a52]/50">
                  {stepsList.map((step: any, i: number) => (
                    <div key={i} className="flex gap-3 p-3 border-b border-[#1a3050] last:border-none items-start">
                      <span className="w-4.5 h-4.5 rounded-full bg-[#00A1E0] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-[10.5px] font-semibold text-white">{step.title || step.fullName || `Update metadata component: ${step.fullName || step.type}`}</div>
                        <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">{step.detail || step.description || `Deploying ${step.type} update`}</div>
                      </div>
                    </div>
                  ))}
                  {stepsList.length === 0 && (
                    <div className="p-3 text-[10px] text-[#4a7fa5] italic text-center">No steps generated yet</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-2">ACCEPTANCE CRITERIA</div>
                <div className="flex flex-col gap-2">
                  {acceptanceCriteria.map((text: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 text-[10.5px]">
                      <div className="w-3 h-3 rounded-sm border border-[#3a6a90] bg-[#021427]"></div>
                      {text}
                    </div>
                  ))}
                  {acceptanceCriteria.length === 0 && (
                    <div className="text-[10.5px] text-[#4a7fa5] italic">No criteria specified</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1e3a52]/50 mt-1">
                <div>
                  <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-1">TARGET ORG</div>
                  <div className="text-[10.5px] text-[#e2e8f0]">{devOrg?.alias || 'Forge AI Dev Org'} (Dev Sandbox)</div>
                  <div className="text-[8px] text-[#4a7fa5] mt-0.5">Connect additional sandboxes to enable pipeline promotions</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-1">GIT BRANCH</div>
                  <div className="text-[10.5px] font-mono text-[#a78bfa]">feature/{ticketKey.toLowerCase()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Build Button */}
          <Link 
            href={`/dashboard?view=p-s2&id=${deployUrlId}`}
            className="w-full bg-[#00A1E0] hover:bg-[#0081B5] active:scale-[0.99] text-white rounded-xl py-3.5 px-4 flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#00A1E0]/20 shrink-0 group"
          >
            <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[11px] border-l-white border-b-[7px] border-b-transparent ml-1 group-hover:scale-110 transition-transform"></div>
            <span className="text-[13px] font-bold uppercase tracking-wider">Start Implementing — Build with Forge AI</span>
          </Link>
          <div className="text-center text-[10px] text-[#3a6a90] pb-4">
            AI will read this Jira ticket, build all Salesforce changes in Dev Sandbox, self-evaluate, then ask for your review
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
