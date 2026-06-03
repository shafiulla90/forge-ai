'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function HumanReview() {
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
        const { data: orgs } = await supabase.from('orgs').select('*').limit(1);
        const activeOrg = orgs && orgs.length > 0 ? orgs[0] : { alias: 'Acme Corp', instance_url: '' };
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

  // Determine the primary layout name (e.g. Account Layout, Opportunity Layout)
  let layoutName = "Opportunity Layout";
  const customFieldStep = stepsList.find((step: any) => step.title?.includes('field:') || step.detail?.includes('Type:'));
  if (customFieldStep) {
    if (customFieldStep.title?.toLowerCase().includes('account') || customFieldStep.detail?.toLowerCase().includes('account')) {
      layoutName = "Account Layout";
    } else if (customFieldStep.title?.toLowerCase().includes('contact') || customFieldStep.detail?.toLowerCase().includes('contact')) {
      layoutName = "Contact Layout";
    } else if (customFieldStep.title?.toLowerCase().includes('lead') || customFieldStep.detail?.toLowerCase().includes('lead')) {
      layoutName = "Lead Layout";
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[220px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge DevOps Pipeline</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52] cursor-pointer">
          <div className="text-[11px] font-semibold text-[#e2e8f0]">{org?.alias || 'Acme Corp'} Dev Sandbox</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Awaiting your review</div>
        </div>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1 uppercase">Review Checklist</div>
        {acceptanceCriteria.slice(0, 4).map((item: string, i: number) => (
          <div key={i} className={`px-[14px] py-[9px] text-[11px] cursor-pointer transition-all ${
            i === 0 ? 'bg-[#0d2a42] text-[#185FA5] border-l-2 border-[#00a1e0]' : 'text-[#7cc4e4] hover:bg-[#031b2e]'
          }`}>
            {item.length > 20 ? item.substring(0, 20) + '...' : item}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className="w-2.5 h-2.5 bg-[#FCD34D] rounded-full shrink-0"></div>
          <div className="text-[13px] font-semibold flex-1 truncate">Your Review — {ticketKey} · Dev Sandbox</div>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#3f2d00] text-[#FCD34D] font-bold border border-[#D97706]/20">Awaiting your decision</span>
        </div>

        {/* Pipeline Status Bar */}
        <div className="flex bg-[#021427] border-b border-[#1e3a52] py-2 px-4 gap-6 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { label: "Jira ticket", status: "Done" },
            { label: "AI build", status: "Done" },
            { label: "AI evaluate", status: `${acceptanceCriteria.length}/${acceptanceCriteria.length} pass` }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center min-w-[70px]">
              <div className="w-5 h-5 rounded-full bg-[#0d2f17] border border-[#22c55e] flex items-center justify-center text-[#22c55e]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
              </div>
              <div className="text-[9px] font-bold mt-1 uppercase opacity-60 tracking-wider">{item.label}</div>
              <div className="text-[8px] text-[#22c55e]">{item.status}</div>
            </div>
          ))}
          <div className="flex flex-col items-center min-w-[70px]">
            <div className="w-5 h-5 rounded-full bg-[#3f2d00] border border-[#FCD34D] flex items-center justify-center text-[10px] text-[#FCD34D]">👤</div>
            <div className="text-[9px] font-bold mt-1 text-[#FCD34D] uppercase tracking-wider">Your review</div>
            <div className="text-[8px] text-[#FCD34D]">Now</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">Git + PR</div>
            <div className="text-[8px]">Pending</div>
          </div>
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-white">→</div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">Next org</div>
            <div className="text-[8px]">Pending</div>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Toast */}
          <div className="bg-[#0d2f17] border border-[#22c55e]/30 rounded-xl p-3.5 flex items-start gap-3 shrink-0">
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <div className="text-[11px] text-[#e2e8f0] leading-relaxed">
              AI built and self-evaluated {ticketKey} — <span className="font-bold text-[#22c55e]">94% confidence</span>, all {acceptanceCriteria.length} acceptance criteria verified. Your review is the final gate before Git commit and promotion to QA Sandbox.
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { text: "↗ Open Dev Sandbox", color: "text-[#185FA5]", bg: "bg-[#021b36]", border: "border-[#00A1E0]" },
              { text: `↗ View ${layoutName}`, color: "text-[#185FA5]", bg: "bg-[#021b36]", border: "border-[#00A1E0]" },
              { text: "↗ Run verification report", color: "text-[#185FA5]", bg: "bg-[#021b36]", border: "border-[#00A1E0]" },
              { text: "↗ View Git PR", color: "text-[#a78bfa]", bg: "bg-[#1a0d2e]", border: "border-[#a78bfa]", href: `/dashboard?view=p-s5&id=${deployUrlId}` }
            ].map((link, i) => (
              <Link 
                key={i} 
                href={link.href || '#'}
                className={`px-3 py-1.5 rounded-lg border ${link.bg} ${link.border} ${link.color} text-[10.5px] font-semibold whitespace-nowrap active:scale-95 transition-all`}
              >
                {link.text}
              </Link>
            ))}
          </div>

          {/* Checklist */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#3f2d00] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#FCD34D]/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <div className="text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Your review checklist — verify in Dev Sandbox</div>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {acceptanceCriteria.map((item: string, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full border border-[#3a6a90] bg-[#1a3050] flex items-center justify-center shrink-0 mt-0.5 cursor-pointer hover:bg-[#3a6a90]/30 transition-all"></div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#e2e8f0]">{item}</div>
                    <div className="text-[10px] text-[#4a7fa5] mt-1">Please confirm that this is correctly visible and active on the sandbox org.</div>
                  </div>
                </div>
              ))}
              {acceptanceCriteria.length === 0 && (
                <div className="text-[11px] text-[#4a7fa5] italic text-center">No acceptance criteria checklist generated</div>
              )}
            </div>
          </div>

          {/* Decision */}
          <div className="bg-[#0d1f35] rounded-xl border border-[#1e3a52] p-4 flex flex-col gap-3 shrink-0">
            <div className="text-[10.5px] font-bold text-[#3a6a90] uppercase tracking-wider">YOUR DECISION</div>
            <textarea 
              className="w-full bg-[#020b16] border border-[#1e3a52] rounded-lg p-3 text-[11px] text-[#e2e8f0] outline-none focus:border-[#00A1E0] transition-all resize-none" 
              placeholder="Add review comments (optional) — e.g. 'Looks good' or 'Field name needs to be changed to...'"
              rows={3}
            />
            <div className="flex gap-2">
              <Link 
                href={`/dashboard?view=p-s5&id=${deployUrlId}`}
                className="flex-[2] bg-[#15803D] hover:bg-[#126932] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-[12px] transition-all active:scale-[0.98]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/></svg>
                Approve — Commit to Git & promote to QA
              </Link>
              <button className="flex-1 bg-[#3f0d0d] hover:bg-[#5a1414] text-[#f87171] font-bold py-3 rounded-xl text-[12px] transition-all active:scale-[0.98]">Request changes</button>
              <button className="flex-1 bg-[#0d1f35] border border-[#1e3a52] hover:bg-[#1a3050] text-[#5a9fd4] py-3 rounded-xl text-[12px] transition-all active:scale-[0.98]">Re-run AI eval</button>
            </div>
          </div>
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
