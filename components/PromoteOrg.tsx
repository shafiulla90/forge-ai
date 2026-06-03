'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function PromoteOrg() {
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
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1 uppercase">PIPELINE STATUS</div>
        {[
          { text: "Dev Sandbox ✓", color: "text-[#22c55e]" },
          { text: "QA Sandbox ✓", color: "text-[#22c55e]" },
          { text: "UAT Sandbox ← now", color: "text-[#D97706]", active: true },
          { text: "Production", color: "text-[#e2e8f0]" }
        ].map((item, i) => (
          <div key={i} className={`px-[14px] py-[9px] text-[11px] cursor-pointer transition-all ${
            item.active ? 'bg-[#0d2a42] border-l-2 border-[#00a1e0]' : 'hover:bg-[#031b2e]'
          } ${item.color}`}>
            {item.text}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className="text-[13px] font-semibold flex-1 truncate">Promote to next org — QA Approved → UAT Sandbox</div>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0d2f17] text-[#22c55e] font-bold border border-[#22c55e]/20">QA ✓ Approved</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#3f2d00] text-[#D97706] font-bold border border-[#D97706]/20">UAT — next</span>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Toast */}
          <div className="bg-[#0d2f17] border border-[#22c55e]/30 rounded-xl p-3.5 flex items-start gap-3 shrink-0">
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/></svg>
            <div className="text-[11px] text-[#e2e8f0] leading-relaxed">
              QA Sandbox approved by QA team (<span className="font-bold text-[#4ade80]">Priya Sharma</span>). {ticketKey} is ready to promote to UAT Sandbox.
            </div>
          </div>

          {/* QA Sign-off Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#22c55e]/30 overflow-hidden shrink-0 shadow-lg shadow-[#22c55e]/5">
            <div className="bg-[#0d2f17] px-3.5 py-2.5 flex items-center justify-between border-b border-[#22c55e]/20">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/></svg>
                <div className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider">QA Sandbox — Approved</div>
              </div>
              <span className="text-[9px] text-[#4a7fa5]">Priya Sharma · 10:15 AM</span>
            </div>
            <div className="p-4">
              <div className="text-[11px] text-[#e2e8f0] leading-relaxed mb-4 italic">
                QA Comment: "All acceptance criteria verified manually. All metadata changes compile and test runs pass. Ready for UAT."
              </div>
              <div className="flex flex-wrap gap-2">
                {["✓ Fields verified", "✓ Layouts tested", "✓ Declaratives confirmed", "✓ Sandbox validated"].map((badge, i) => (
                  <span key={i} className="text-[8px] font-bold px-2 py-0.5 rounded bg-[#0d2f17] text-[#4ade80] border border-[#22c55e]/20 uppercase tracking-wider">{badge}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Promote Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#D97706]/40 overflow-hidden shrink-0 shadow-lg shadow-[#D97706]/5">
            <div className="bg-[#3f2d00] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#D97706]/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <div className="text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Promote to UAT Sandbox</div>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#020b16] rounded-lg p-3 border border-[#1e3a52]/30">
                  <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-1 uppercase">From</div>
                  <div className="text-[11px] font-bold text-[#22c55e]">QA Sandbox ✓</div>
                  <div className="text-[9.5px] text-[#4a7fa5] font-mono mt-0.5">acme-qa.my.salesforce.com</div>
                </div>
                <div className="bg-[#020b16] rounded-lg p-3 border border-[#1e3a52]/30">
                  <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-1 uppercase">To</div>
                  <div className="text-[11px] font-bold text-[#D97706]">UAT Sandbox</div>
                  <div className="text-[9.5px] text-[#4a7fa5] font-mono mt-0.5">acme-uat.my.salesforce.com</div>
                </div>
              </div>

              <div className="bg-[#020b16] rounded-lg p-3 border border-[#1e3a52]/30">
                <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-2 uppercase">Changes to be promoted ({stepsList.length})</div>
                <div className="flex flex-col gap-1.5 text-[10.5px] text-[#e2e8f0]">
                  {stepsList.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[#22c55e]">✓</span>
                      <span><span className="font-mono text-[#7CC4E4]">{step.title || step.fullName}</span> — {step.detail || step.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#020b16] rounded-lg p-3 border border-[#1e3a52]/30">
                <div className="text-[9px] font-bold text-[#4a7fa5] tracking-wider mb-1 uppercase">Source</div>
                <div className="text-[10px] font-mono text-[#a78bfa] leading-relaxed">
                  Git branch: feature/{ticketKey.toLowerCase()}<br/>
                  Latest commit verified by AI build & human approved.
                </div>
              </div>

              <Link 
                href={`/dashboard?view=p-s8&id=${deployUrlId}`}
                className="w-full bg-[#D97706] hover:bg-[#B45309] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-[13px] transition-all active:scale-[0.98] shadow-lg shadow-[#D97706]/20"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Deploy to UAT Sandbox now
              </Link>
              <div className="text-center text-[9.5px] text-[#4a7fa5]">
                UAT deployment will also update Jira ticket {ticketKey} → status "In UAT"
              </div>
            </div>
          </div>

          {/* Jira Auto-update Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d1f35] px-3.5 py-2.5 border-b border-[#1e3a52]/50">
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Jira auto-updates on each org promotion</div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {[
                { label: "Dev Sandbox deployed → Jira status:", status: "In Dev", color: "text-[#22c55e]", dot: "bg-[#0052CC]" },
                { label: "QA Sandbox deployed → Jira status:", status: "In QA", color: "text-[#22c55e]", dot: "bg-[#0052CC]" },
                { label: "UAT Sandbox deploying → Jira status will be:", status: "In UAT ← now", color: "text-[#FCD34D]", dot: "bg-[#D97706]" },
                { label: "Production deployed → Jira status:", status: "Done (auto-close ticket)", color: "text-[#3a6a90]", dot: "bg-[#1a3050]" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-[10.5px]">
                  <div className={`w-3 h-3 rounded-[3px] shrink-0 ${item.dot}`}></div>
                  <span className="text-[#e2e8f0]">{item.label} <span className={item.color}>{item.status}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
