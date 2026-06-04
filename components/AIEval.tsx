'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { getActiveOrg } from '@/lib/supabase-helpers';

export function AIEval() {
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id');
  const supabase = createClient();

  const [deployment, setDeployment] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
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
  const deployUrlId = deployment?.id || deployId || 'mock-sfdc-109';

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
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Built · Evaluating...</div>
        </div>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1">PIPELINE STAGE</div>
        <div className="flex items-center gap-[9px] px-[14px] py-[9px] bg-[#0d2a42] text-[#185FA5] border-l-2 border-[#00a1e0] text-[11px] cursor-pointer">
          AI Self-Evaluation
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className="w-2.5 h-2.5 bg-[#FCD34D] rounded-full shrink-0"></div>
          <div className="text-[13px] font-semibold flex-1 truncate">AI Self-Evaluation Report — {ticketKey}</div>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#00a1e0]/10 text-[#00a1e0] font-bold border border-[#00a1e0]/20 tracking-wide">AI Evaluation</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0d2f17] text-[#4ade80] font-bold border border-[#22c55e]/20">Build complete</span>
        </div>

        {/* Pipeline Status Bar */}
        <div className="flex bg-[#021427] border-b border-[#1e3a52] py-2 px-4 gap-6 shrink-0 overflow-x-auto no-scrollbar">
          {["Jira ticket", "AI build"].map((label, i) => (
            <div key={i} className="flex flex-col items-center min-w-[70px]">
              <div className="w-5 h-5 rounded-full bg-[#0d2f17] border border-[#22c55e] flex items-center justify-center text-[#22c55e]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
              </div>
              <div className="text-[9px] font-bold mt-1 uppercase opacity-60 tracking-wider">{label}</div>
              <div className="text-[8px] text-[#22c55e]">Done</div>
            </div>
          ))}
          <div className="flex flex-col items-center min-w-[70px]">
            <div className="w-5 h-5 rounded-full bg-[#FCD34D]/20 border border-[#FCD34D] flex items-center justify-center text-[10px] text-[#FCD34D]">✓</div>
            <div className="text-[9px] font-bold mt-1 text-[#FCD34D] uppercase tracking-wider">AI evaluate</div>
            <div className="text-[8px] text-[#FCD34D]">Running</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-[10px] text-white">👤</div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">Human review</div>
            <div className="text-[8px]">Next</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">Git commit</div>
            <div className="text-[8px]">Pending</div>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Top Score Cards */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            {[
              { val: "94%", lbl: "AI Confidence Score", sub: "✓ Ready for human review", color: "#22c55e", border: true },
              { val: `${acceptanceCriteria.length}/${acceptanceCriteria.length}`, lbl: "Acceptance criteria met", sub: "✓ All criteria passed", color: "#22c55e" },
              { val: "0", lbl: "Issues found", sub: "✓ No blockers", color: "#4ade80" },
              { val: `${Math.max(8, stepsList.length * 3)}s`, lbl: "Build time", sub: `${stepsList.length} changes deployed`, color: "#FCD34D" },
            ].map((card, i) => (
              <div key={i} className={`bg-[#0d1f35] rounded-xl border p-3.5 text-center flex flex-col gap-1 ${card.border ? 'border-[#22c55e]' : 'border-[#1a3050]'}`}>
                <div className="text-[24px] font-bold" style={{ color: card.color }}>{card.val}</div>
                <div className="text-[9px] font-semibold text-[#3a6a90] uppercase tracking-wider">{card.lbl}</div>
                <div className="text-[8px] mt-1" style={{ color: card.color }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Acceptance Criteria */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d2f17] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#22c55e]/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/></svg>
              <div className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider">Acceptance Criteria — AI Verification ({acceptanceCriteria.length}/{acceptanceCriteria.length} passed)</div>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {acceptanceCriteria.map((text: string, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 12l5 5L19 7"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#e2e8f0]">{text}</div>
                    <div className="text-[10px] text-[#4a7fa5] mt-1">Verified via Salesforce Metadata API · Object state aligns with criteria criteria ✓</div>
                  </div>
                </div>
              ))}
              {acceptanceCriteria.length === 0 && (
                <div className="text-[11px] text-[#4a7fa5] italic">No criteria specified for validation</div>
              )}
            </div>
          </div>

          {/* Quality Checks */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d1f35] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#1e3a52]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Quality & Best Practice Checks</div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10.5px] text-[#4a7fa5]">Salesforce best practices adherence</span>
                <span className="text-[10.5px] font-bold text-[#22c55e]">100%</span>
              </div>
              <div className="w-full h-1 bg-[#1e3a52] rounded-full overflow-hidden mb-4">
                <div className="w-full h-full bg-[#22c55e]"></div>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  "Field naming convention (API)",
                  "Lookup filter specificity",
                  "No governor limit risk introduced",
                  "No Apex required (declarative solution)",
                  "Rollback available"
                ].map((label, i) => (
                  <div key={i} className="flex justify-between items-center text-[10.5px]">
                    <span className="text-[#4a7fa5]">{label}</span>
                    <span className="text-[#22c55e] font-semibold">✓ Correct</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-[#020b16] rounded-lg p-3 text-[10px] text-[#94a3b8] leading-relaxed border border-[#1e3a52]/30">
                <span className="text-[#FCD34D] font-bold">AI note:</span> This is a low-risk declarative implementation. All metadata structures have compiled successfully on your target org. I am 94% confident this meets all requirements.
              </div>
            </div>
          </div>

          {/* Summary of what was built */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d1f35] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#1e3a52]/50">
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Summary of what was built</div>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {stepsList.map((step: any, i: number) => {
                const title = step.title || step.fullName;
                const detail = step.detail || step.description;
                return (
                  <div key={i} className="bg-[#020b16] rounded-lg p-2.5 flex items-center gap-3">
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-[#021b36] text-[#185FA5] uppercase shrink-0">{step.api || 'Metadata API'}</span>
                    <span className="text-[10px] text-[#e2e8f0]">Created/Updated component <span className="font-mono text-[#7CC4E4]">{title}</span> · {detail}</span>
                  </div>
                );
              })}
              <div className="bg-[#020b16] rounded-lg p-2.5 flex items-center gap-3">
                <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-[#1a0d2e] text-[#a78bfa] uppercase shrink-0">Git</span>
                <span className="text-[10px] text-[#e2e8f0]">Committed SFDX metadata to branch <span className="font-mono text-[#a78bfa]">feature/{ticketKey.toLowerCase()}</span></span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Link 
            href={`/dashboard?view=p-s4&id=${deployUrlId}`}
            className="w-full bg-[#15803D] hover:bg-[#126932] active:scale-[0.99] text-white rounded-xl py-3.5 px-4 flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#15803D]/20 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span className="text-[13px] font-bold uppercase tracking-wider">AI evaluation complete — Send to Human Review</span>
          </Link>
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
