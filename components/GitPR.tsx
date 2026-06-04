'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { getActiveOrg } from '@/lib/supabase-helpers';

export function GitPR() {
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
  const ticketSummary = ticketDetails?.summary || 'Partner referral tracking';
  const deployUrlId = deployment?.id || deployId || 'mock-sfdc-109';

  // Construct commits and files changed list
  const commits: any[] = [];
  const files: any[] = [];
  let diffObject = "Opportunity";
  let diffFile = "force-app/main/default/objects/Opportunity/fields/Referral_Partner__c.field-meta.xml";
  let diffLines: string[] = [
    `1   <?xml version="1.0" encoding="UTF-8"?>`,
    `2   <CustomField xmlns="http://soap.sforce.com/2006/04/metadata">`,
    `3 +   <fullName>Referral_Partner__c</fullName>`,
    `4 +   <label>Referred by Partner</label>`,
    `5 +   <type>Lookup</type>`,
    `6 +   <referenceTo>Account</referenceTo>`,
    `7 +   <lookupFilter>`,
    `8 +     <filterItems>`,
    `9 +       <field>Account.RecordType.Name</field>`,
    `10 +      <operation>equals</operation>`,
    `11 +      <value>Partner</value>`,
    `12 +    </filterItems>`,
    `13 +   </lookupFilter>`,
    `...`
  ];

  stepsList.forEach((step: any, idx: number) => {
    const title = step.title || step.fullName;
    const detail = step.detail || step.description;
    const cleanTitle = title.replace(/^Create field:\s*|^Create Custom Field:\s*/i, '');
    const fieldName = cleanTitle.split(' ')[0] || 'Custom_Field__c';

    // Generate Commit Hash
    const hash = Math.random().toString(16).substring(2, 9);
    commits.push({
      hash,
      msg: `feat(${ticketKey}): ${title}`,
      sub: `Added metadata changeset for ${cleanTitle} · ${detail}`,
      time: "9:41 AM"
    });

    // Generate File Path
    if (title.toLowerCase().includes('field')) {
      const parentObj = title.toLowerCase().includes('account') ? 'Account' : 'Opportunity';
      diffObject = parentObj;
      diffFile = `force-app/main/default/objects/${parentObj}/fields/${fieldName}.field-meta.xml`;
      files.push({
        path: diffFile,
        lines: "+22",
        color: "text-[#22c55e]"
      });
      diffLines = [
        `1   <?xml version="1.0" encoding="UTF-8"?>`,
        `2   <CustomField xmlns="http://soap.sforce.com/2006/04/metadata">`,
        `3 +   <fullName>${fieldName}</fullName>`,
        `4 +   <label>${cleanTitle.split('·')[0] || cleanTitle}</label>`,
        `5 +   <type>Lookup</type>`,
        `6 +   <referenceTo>Account</referenceTo>`,
        `...`
      ];
    } else if (title.toLowerCase().includes('layout')) {
      files.push({
        path: `force-app/main/default/layouts/${diffObject}-${diffObject} Layout.layout-meta.xml`,
        lines: "+8",
        color: "text-[#22c55e]"
      });
    } else if (title.toLowerCase().includes('report')) {
      files.push({
        path: `force-app/main/default/reports/Sales_Reports/Custom_Report.report-meta.xml`,
        lines: "+34",
        color: "text-[#22c55e]"
      });
    } else if (title.toLowerCase().includes('flow')) {
      files.push({
        path: `force-app/main/default/flows/Auto_Update_Flow.flow-meta.xml`,
        lines: "+62",
        color: "text-[#22c55e]"
      });
    } else {
      files.push({
        path: `force-app/main/default/components/${fieldName}.component-meta.xml`,
        lines: "+12",
        color: "text-[#22c55e]"
      });
    }
  });

  files.push({
    path: "manifest/package.xml",
    lines: `+${stepsList.length + 1}`,
    color: "text-[#D97706]"
  });

  if (commits.length === 0) {
    commits.push({
      hash: "a3f7c12",
      msg: `feat(${ticketKey}): Salesforce metadata bundle`,
      sub: "Added dynamic changesets",
      time: "9:41 AM"
    });
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
          <div className="text-[11px] font-semibold text-[#e2e8f0]">GitHub — Acme SF Repo</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">1 open PR · {ticketKey}</div>
        </div>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1 uppercase">Branches</div>
        <div className="px-[14px] py-[9px] bg-[#0d2a42] text-[#185FA5] border-l-2 border-[#00a1e0] text-[10px] font-mono cursor-pointer">
          feature/{ticketKey.toLowerCase()}-...
        </div>
        {["main", "release/v2.4"].map((branch, i) => (
          <div key={i} className="px-[14px] py-[9px] text-[#7cc4e4] hover:bg-[#031b2e] text-[10px] font-mono cursor-pointer">
            {branch}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M6 9v6M9 6h7.6A2.4 2.4 0 0 1 19 8.4V15" strokeLinecap="round"/></svg>
          <div className="text-[13px] font-semibold flex-1 truncate">Git — feature/{ticketKey.toLowerCase()}-branch</div>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0d2f17] text-[#22c55e] font-bold border border-[#22c55e]/20">Open PR #48</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#1a0d2e] text-[#a78bfa] font-bold border border-[#a78bfa]/20">{commits.length} commits · AI built</span>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Branch Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#1a0d2e] border border-[#a78bfa]/30 rounded-full text-[10px] text-[#a78bfa] font-mono">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v12M9 6h4" strokeLinecap="round"/></svg>
              feature/{ticketKey.toLowerCase()}-tracking
            </div>
            <span className="text-[10px] text-[#4a7fa5]">← from main · {commits.length} commits ahead</span>
            <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-[#3f2d00] text-[#FCD34D] border border-[#D97706]/20 uppercase">AI-generated branch</span>
          </div>

          {/* PR Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] p-4 shrink-0">
            <div className="flex items-center gap-2.5 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#238636" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M6 9v6M15 6h.6A2.4 2.4 0 0 1 18 8.4V15" strokeLinecap="round"/></svg>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#0d2f17] text-[#22c55e] border border-[#22c55e]/20 rounded">OPEN</span>
              <div className="text-[13px] font-bold text-[#e2e8f0]">PR #48: [{ticketKey}] {ticketSummary}</div>
            </div>
            <div className="text-[10.5px] leading-relaxed text-[#4a7fa5]">
              <span className="text-[#a78bfa] font-semibold">⚡ forge-ai-bot</span> wants to merge {commits.length} commits into <span className="text-[#7cc4e4] font-mono">main</span> from <span className="text-[#a78bfa] font-mono">feature/{ticketKey.toLowerCase()}-tracking</span><br/>
              Linked Jira: <span className="text-[#0052CC] font-bold"> {ticketKey}</span> · AI Confidence: <span className="text-[#22c55e] font-bold">94%</span> · Human approved: <span className="text-[#22c55e] font-bold">✓</span><br/>
              Org tested: <span className="text-[#22c55e] font-bold">Dev Sandbox ✓</span> · Acceptance criteria: <span className="text-[#22c55e] font-bold">{acceptanceCriteria.length}/{acceptanceCriteria.length} ✓</span>
            </div>
          </div>

          {/* Commits List */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d1f35] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#1e3a52]/50">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M1.05 12H7M17 12h5.95" strokeLinecap="round"/></svg>
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Commits ({commits.length}) — all by Forge AI</div>
            </div>
            <div className="flex flex-col">
              {commits.map((commit, i) => (
                <div key={i} className="flex gap-3 p-3 border-b border-[#0d2137] last:border-none hover:bg-white/5 transition-colors cursor-pointer">
                  <span className="text-[10px] font-mono text-[#4a7fa5] shrink-0 mt-0.5">{commit.hash}</span>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-[#e2e8f0]">{commit.msg}</div>
                    <div className="text-[10px] text-[#4a7fa5] mt-0.5">{commit.sub}</div>
                  </div>
                  <span className="text-[9px] text-[#4a7fa5] shrink-0 mt-0.5">{commit.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Files Changed */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d1f35] px-3.5 py-2.5 flex items-center justify-between border-b border-[#1e3a52]/50">
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Files changed ({files.length}) — SFDX metadata format</div>
            </div>
            <div className="flex flex-col">
              {files.map((file, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2.5 border-b border-[#0d2137] last:border-none hover:bg-white/5 transition-colors cursor-pointer">
                  <span className="text-[10.5px] font-mono text-[#e2e8f0] truncate">{file.path}</span>
                  <span className={`text-[10px] font-bold ${file.color} ml-3`}>{file.lines}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diff Viewer */}
          <div className="bg-[#020b16] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0 flex flex-col">
            <div className="bg-[#0d1f35] px-3 py-1.5 flex items-center gap-2 border-b border-[#1e3a52]/50">
              <div className="text-[9.5px] font-mono text-[#4a7fa5]">{diffFile}</div>
              <span className="text-[9px] font-bold text-[#22c55e] ml-auto">+22 lines</span>
            </div>
            <div className="p-3 font-mono text-[9px] leading-relaxed overflow-x-auto whitespace-pre bg-[#020b16]">
              {diffLines.map((line, i) => {
                const isAddition = line.includes(' + ');
                return (
                  <div key={i} className={isAddition ? "bg-[#0d2f17] text-[#4ade80] px-1" : "text-[#4a7fa5]"}>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            <Link 
              href={`/dashboard?view=p-s6&id=${deployUrlId}`}
              className="flex-[2] bg-[#15803D] hover:bg-[#126932] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-[13px] transition-all active:scale-[0.98] shadow-lg shadow-[#15803D]/20"
            >
              Merge PR · Promote to QA Sandbox
            </Link>
            <button className="flex-1 bg-[#0d1f35] border border-[#1e3a52] hover:bg-[#1a3050] text-[#5a9fd4] py-3.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.98]">
              Request code review
            </button>
          </div>
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
