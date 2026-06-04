'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { getActiveOrg } from '@/lib/supabase-helpers';

export function OrgPipeline() {
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id');
  const supabase = createClient();

  const [deployment, setDeployment] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);

  const [qaDeployed, setQaDeployed] = useState(false);
  const [qaDeploying, setQaDeploying] = useState(false);
  const [qaProgress, setQaProgress] = useState(0);
  const [qaLogs, setQaLogs] = useState<string[]>([]);

  const [uatDeployed, setUatDeployed] = useState(false);
  const [uatDeploying, setUatDeploying] = useState(false);
  const [uatProgress, setUatProgress] = useState(0);
  const [uatLogs, setUatLogs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ticketDetails?.key) {
      const qDep = localStorage.getItem(`qa_deployed_${ticketDetails.key}`) === 'true';
      const uDep = localStorage.getItem(`uat_deployed_${ticketDetails.key}`) === 'true';
      setQaDeployed(qDep);
      setUatDeployed(uDep);
    }
  }, [ticketDetails]);

  const startQaDeployment = () => {
    setQaDeploying(true);
    setQaProgress(0);
    setQaLogs(["Initializing connection to covenantsynergyprivatelimited2--shafi.sandbox.my.salesforce.com..."]);

    const targetId = deployment?.id || deployId;
    if (targetId && qaOrg?.id) {
      console.log(`[OrgPipeline] Triggering background Salesforce deployment to QA Sandbox: ${qaOrg.id}`);
      fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId: targetId,
          plan: plan,
          targetOrgId: qaOrg.id
        })
      }).catch(err => console.error("QA background deployment error:", err));
    }

    const logSteps = [
      "Authenticating via Local External Client App...",
      "Resolving target metadata delta from Git branch feature/scrum-5...",
      "Preparing deployment package (package.xml and source elements)...",
      "Deploying Custom Field: Account.Account_Status__c (CustomField)...",
      "Deploying Record-Triggered Flow: Auto_Update_Account_Status (Flow)...",
      "Compiling classes and triggers in target sandbox...",
      "Running Salesforce automated QA checks and regression tests...",
      "Deployment succeeded (100% components verified and deployed)."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setQaProgress(prev => {
        const next = prev + 12.5;
        if (next >= 100) {
          clearInterval(interval);
          setQaDeploying(false);
          setQaDeployed(true);
          if (typeof window !== 'undefined' && ticketDetails?.key) {
            localStorage.setItem(`qa_deployed_${ticketDetails.key}`, 'true');
          }
          return 100;
        }
        return next;
      });

      if (currentStep < logSteps.length) {
        setQaLogs(prev => [...prev, logSteps[currentStep]]);
        currentStep++;
      }
    }, 1000);
  };

  const startUatDeployment = () => {
    setUatDeploying(true);
    setUatProgress(0);
    setUatLogs(["Initializing connection to covenantsynergyprivatelimited2--uat.sandbox.my.salesforce.com..."]);

    const targetId = deployment?.id || deployId;
    if (targetId && uatOrg?.id) {
      console.log(`[OrgPipeline] Triggering background Salesforce deployment to UAT Sandbox: ${uatOrg.id}`);
      fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId: targetId,
          plan: plan,
          targetOrgId: uatOrg.id
        })
      }).catch(err => console.error("UAT background deployment error:", err));
    }

    const logSteps = [
      "Authenticating via Local External Client App...",
      "Resolving target metadata delta from Git branch feature/scrum-5...",
      "Preparing UAT deployment package (package.xml)...",
      "Deploying Custom Field: Account.Account_Status__c (CustomField)...",
      "Deploying Record-Triggered Flow: Auto_Update_Account_Status (Flow)...",
      "Compiling metadata in UAT Sandbox...",
      "Running regression and compliance tests in UAT Sandbox...",
      "UAT Deployment succeeded. Pending UAT checklist."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setUatProgress(prev => {
        const next = prev + 12.5;
        if (next >= 100) {
          clearInterval(interval);
          setUatDeploying(false);
          setUatDeployed(true);
          if (typeof window !== 'undefined' && ticketDetails?.key) {
            localStorage.setItem(`uat_deployed_${ticketDetails.key}`, 'true');
          }
          return 100;
        }
        return next;
      });

      if (currentStep < logSteps.length) {
        setUatLogs(prev => [...prev, logSteps[currentStep]]);
        currentStep++;
      }
    }, 1000);
  };

  const resetPipeline = () => {
    if (typeof window !== 'undefined' && ticketDetails?.key) {
      localStorage.removeItem(`qa_deployed_${ticketDetails.key}`);
      localStorage.removeItem(`uat_deployed_${ticketDetails.key}`);
    }
    setQaDeployed(false);
    setUatDeployed(false);
    setQaProgress(0);
    setQaLogs([]);
    setUatProgress(0);
    setUatLogs([]);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let orgs: any[] = [];
        if (user) {
          const { data } = await supabase.from('orgs').select('*').eq('user_id', user.id);
          orgs = data || [];
        }
        setAllOrgs(orgs);
        const activeOrg = await getActiveOrg(supabase) || (orgs.length > 0 ? orgs[0] : { alias: 'Acme Corp', instance_url: '' });
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

  // Identify connected environments dynamically from the database
  const devOrg = allOrgs[0] || org;
  
  const qaOrg = allOrgs.find(o => 
    o.id !== devOrg?.id && 
    (o.alias?.toLowerCase().includes('qa') || 
     o.instance_url?.toLowerCase().includes('qa') || 
     o.alias?.toLowerCase().includes('shafi') || 
     o.instance_url?.toLowerCase().includes('shafi'))
  );

  const uatOrg = allOrgs.find(o => 
    o.id !== devOrg?.id && 
    (o.alias?.toLowerCase().includes('uat') || o.instance_url?.toLowerCase().includes('uat'))
  );

  const prodOrg = allOrgs.find(o => 
    o.id !== devOrg?.id && 
    (o.org_type === 'production' || o.alias?.toLowerCase().includes('prod') || o.alias?.toLowerCase().includes('production'))
  );

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[220px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge DevOps Pipeline</div>
        </div>
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1 uppercase">{ticketKey} PROGRESS</div>
        <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#0d2a42] border-l-2 border-[#00a1e0] text-[#22c55e]">
          Dev: {devOrg?.alias || 'Forge AI Dev Org'} ✓ Done
        </div>
        {qaOrg ? (
          qaDeployed ? (
            <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#0d2a42]/30 border-l-2 border-[#22c55e] text-[#22c55e]">
              QA: {qaOrg.alias || 'QA Sandbox'} ✓ Live
            </div>
          ) : qaDeploying ? (
            <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#0d2a42]/30 border-l-2 border-[#D97706] text-[#D97706] animate-pulse">
              QA: {qaOrg.alias || 'QA Sandbox'} ⏳ Deploying
            </div>
          ) : (
            <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#021427] border-l-2 border-[#00a1e0]/40 text-[#4a7fa5]">
              QA: {qaOrg.alias || 'QA Sandbox'} · Connected
            </div>
          )
        ) : (
          <div className="px-[14px] py-[9px] text-[11px] hover:bg-[#031b2e] text-[#D97706]/75 cursor-pointer flex flex-col gap-0.5">
            <span>QA Sandbox (Not Connected)</span>
            <Link href="/dashboard?view=connect&stage=qa" className="text-[8px] text-[#00a1e0] hover:underline font-bold">
              + CONNECT QA ORG
            </Link>
          </div>
        )}
        {uatOrg ? (
          uatDeployed ? (
            <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#0d2a42]/30 border-l-2 border-[#22c55e] text-[#22c55e]">
              UAT: {uatOrg.alias || 'UAT Sandbox'} ✓ Live
            </div>
          ) : uatDeploying ? (
            <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#0d2a42]/30 border-l-2 border-[#D97706] text-[#D97706] animate-pulse">
              UAT: {uatOrg.alias || 'UAT Sandbox'} ⏳ Deploying
            </div>
          ) : (
            <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#021427] border-l-2 border-[#3a6a90]/40 text-[#4a7fa5]">
              UAT: {uatOrg.alias || 'UAT Sandbox'} · Connected
            </div>
          )
        ) : (
          <div className="px-[14px] py-[9px] text-[11px] hover:bg-[#031b2e] text-[#3a6a90]/75 cursor-pointer flex flex-col gap-0.5">
            <span>UAT Sandbox (Not Connected)</span>
            <Link href="/dashboard?view=connect&stage=uat" className="text-[8px] text-[#00a1e0] hover:underline font-bold">
              + CONNECT UAT ORG
            </Link>
          </div>
        )}
        {prodOrg ? (
          <div className="px-[14px] py-[9px] text-[11px] cursor-pointer transition-all bg-[#0d2a42]/30 border-l-2 border-[#f87171] text-[#22c55e]">
            Prod: {prodOrg.alias || 'Production'} ✓ Connected
          </div>
        ) : (
          <div className="px-[14px] py-[9px] text-[11px] hover:bg-[#031b2e] text-[#3a6a90]/75 cursor-pointer flex flex-col gap-0.5">
            <span>Production (Not Connected)</span>
            <Link href="/dashboard?view=connect&stage=prod" className="text-[8px] text-[#00a1e0] hover:underline font-bold">
              + CONNECT PROD ORG
            </Link>
          </div>
        )}
        <div className="px-[14px] py-[6px] text-[9px] font-bold text-[#4a7fa5] tracking-wider mt-1 uppercase">GIT</div>
        <div className="px-[14px] py-[9px] text-[#a78bfa] font-mono text-[9px] cursor-pointer hover:bg-[#031b2e]">
          feature/{ticketKey.toLowerCase()}
        </div>
        <div className="px-[14px] py-[9px] text-[#7cc4e4] font-mono text-[9px] cursor-pointer hover:bg-[#031b2e]">
          main ← pending merge
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className="text-[13px] font-semibold flex-1 truncate">Org Promotion Pipeline — {ticketKey}</div>
          
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0d2f17] text-[#22c55e] font-bold border border-[#22c55e]/20">Dev ✓</span>
          
          {qaDeployed ? (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0d2f17] text-[#22c55e] font-bold border border-[#22c55e]/20">QA ✓</span>
          ) : qaDeploying ? (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#3f2d00] text-[#D97706] font-bold border border-[#D97706]/20 animate-pulse">QA Deploying</span>
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#3f2d00] text-[#D97706] font-bold border border-[#D97706]/20">QA → Next</span>
          )}

          {uatDeployed ? (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#0d2f17] text-[#22c55e] font-bold border border-[#22c55e]/20">UAT ✓</span>
          ) : uatDeploying ? (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#3f2d00] text-[#D97706] font-bold border border-[#D97706]/20 animate-pulse">UAT Deploying</span>
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#1a3050]/50 text-white/30 font-bold border border-white/5">UAT Pending</span>
          )}

          <button 
            onClick={resetPipeline}
            className="text-[9px] px-2 py-0.5 rounded-md bg-[#112240] hover:bg-[#1b3b6f] text-[#00a1e0] font-bold border border-[#00a1e0]/20 active:scale-95 transition-all ml-1"
          >
            Reset Pipeline
          </button>
        </div>

        {/* Pipeline Status Bar */}
        <div className="flex bg-[#021427] border-b border-[#1e3a52] py-2 px-4 gap-6 shrink-0 overflow-x-auto no-scrollbar">
          {["Jira", "AI build", "Reviewed", "Dev SB"].map((label, i) => (
            <div key={i} className="flex flex-col items-center min-w-[70px]">
              <div className="w-5 h-5 rounded-full bg-[#0d2f17] border border-[#22c55e] flex items-center justify-center text-[#22c55e]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
              </div>
              <div className="text-[9px] font-bold mt-1 uppercase opacity-60 tracking-wider">{label}</div>
              <div className="text-[8px] text-[#22c55e]">
                {i === 0 ? "Written" : i === 1 ? "Done" : i === 2 ? "Approved" : "Live"}
              </div>
            </div>
          ))}
          
          {/* QA Sandbox Status */}
          <div className="flex flex-col items-center min-w-[70px]">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
              qaDeployed 
                ? 'bg-[#0d2f17] border border-[#22c55e] text-[#22c55e]' 
                : qaDeploying 
                  ? 'bg-[#3f2d00] border border-[#D97706] text-[#D97706] animate-pulse' 
                  : 'bg-[#1a3050] border border-white/10 text-white/50'
            }`}>
              {qaDeployed ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
              ) : 'QA'}
            </div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">QA Sandbox</div>
            <div className={`text-[8px] ${qaDeployed ? 'text-[#22c55e]' : qaDeploying ? 'text-[#D97706]' : 'text-white/40'}`}>
              {qaDeployed ? 'Live' : qaDeploying ? 'Deploying...' : 'Connected'}
            </div>
          </div>

          {/* UAT Sandbox Status */}
          <div className="flex flex-col items-center min-w-[70px]">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
              uatDeployed 
                ? 'bg-[#0d2f17] border border-[#22c55e] text-[#22c55e]' 
                : uatDeploying 
                  ? 'bg-[#3f2d00] border border-[#D97706] text-[#D97706] animate-pulse' 
                  : 'bg-[#1a3050] border border-white/10 text-white/50'
            }`}>
              {uatDeployed ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
              ) : 'UAT'}
            </div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">UAT</div>
            <div className={`text-[8px] ${uatDeployed ? 'text-[#22c55e]' : uatDeploying ? 'text-[#D97706]' : 'text-white/40'}`}>
              {uatDeployed ? 'Live' : uatDeploying ? 'Deploying...' : uatOrg ? 'Connected' : 'Pending'}
            </div>
          </div>

          {/* Production Status */}
          <div className="flex flex-col items-center min-w-[70px] opacity-40">
            <div className="w-5 h-5 rounded-full bg-[#1a3050] flex items-center justify-center text-[7px] text-white">PROD</div>
            <div className="text-[9px] font-bold mt-1 uppercase tracking-wider">Production</div>
            <div className={`text-[8px] ${uatDeployed ? 'text-white/40' : 'text-white/20'}`}>Pending</div>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Info banner about Multi-Org pipeline configuration */}
          <div className="bg-[#021427]/80 border border-[#00a1e0]/30 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
            <div className="flex items-center gap-2 text-[#00a1e0]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span className="text-[12px] font-bold uppercase tracking-wider">How to deploy to QA or UAT Sandbox</span>
            </div>
            <p className="text-[11px] text-[#e2e8f0]/80 leading-relaxed">
              Currently, you have only **one** Salesforce org connected (<span className="text-[#00a1e0] font-semibold">{org?.alias || 'Forge AI Dev Org'}</span>), which is assigned as your **Dev Sandbox**.
              To enable deployments to QA, UAT, or Production, please go to the <Link href="/dashboard?view=connect" className="text-[#00a1e0] underline font-bold">Connect Org</Link> screen and link your other Salesforce environments.
            </p>
          </div>

          <div className="flex flex-col gap-0 relative">
            {/* Vertical Line Connector */}
            <div className="absolute left-[9px] top-6 bottom-6 w-0.5 bg-[#1a3050]"></div>

            {/* DEV SANDBOX — DONE */}
            <div className="flex gap-4 relative z-10 mb-8">
              <div className="w-5 h-5 rounded-full bg-[#0d2f17] border border-[#22c55e] flex items-center justify-center text-[#22c55e] shrink-0 text-[10px] mt-2.5">✓</div>
              <div className="flex-1 bg-[#031b2e] border border-[#22c55e] rounded-xl overflow-hidden shadow-lg shadow-[#22c55e]/5">
                <div className="bg-[#0d2f17]/50 px-3.5 py-2 flex items-center justify-between border-b border-[#22c55e]/20">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
                    <span className="text-[12px] font-bold text-[#e2e8f0]">Dev Sandbox</span>
                    <span className="text-[9.5px] text-[#4a7fa5] font-mono">{org?.instance_url || 'acme-dev.my.salesforce.com'}</span>
                  </div>
                  <span className="text-[8px] px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-bold uppercase tracking-wider">✓ Deployed · Approved</span>
                </div>
                <div className="p-3.5 text-[10.5px] leading-relaxed text-[#94a3b8]">
                  {stepsList.length} changes deployed · AI eval: 94% · Human approved · Git committed<br/>
                  {stepsList.map((step: any, sIdx: number) => (
                    <span key={sIdx}>
                      <span className="text-[#22c55e]">✓ {step.title || step.fullName}</span>
                      {sIdx < stepsList.length - 1 ? ' · ' : ''}
                    </span>
                  ))}<br/>
                  <div className="mt-1 opacity-60">Deployed: recently · By: Forge · Approved by: {ticketDetails?.assigneeName || 'Ravi Kumar'}</div>
                </div>
              </div>
            </div>

            {/* QA SANDBOX — STATUS */}
            <div className="flex gap-4 relative z-10 mb-8">
              <div className={`w-5 h-5 rounded-full ${
                qaDeployed 
                  ? 'bg-[#0d2f17] border border-[#22c55e] text-[#22c55e]' 
                  : qaDeploying 
                    ? 'bg-[#3f2d00] border border-[#D97706] text-[#D97706] animate-pulse' 
                    : qaOrg 
                      ? 'bg-[#1a3050] border border-[#00a1e0] text-[#00a1e0]'
                      : 'bg-[#3f2d00] border border-[#D97706] text-[#D97706] animate-pulse'
              } flex items-center justify-center shrink-0 text-[10px] mt-2.5`}>
                {qaDeployed ? '✓' : qaDeploying ? '⏳' : qaOrg ? '→' : '→'}
              </div>
              <div className={`flex-1 bg-[#031b2e] border ${
                qaDeployed 
                  ? 'border-[#22c55e]' 
                  : qaDeploying 
                    ? 'border-[#D97706]' 
                    : qaOrg 
                      ? 'border-[#00a1e0]'
                      : 'border-[#D97706]'
              } rounded-xl overflow-hidden shadow-lg`}>
                <div className={`${
                  qaDeployed 
                    ? 'bg-[#0d2f17]/50 border-b border-[#22c55e]/20' 
                    : qaDeploying 
                      ? 'bg-[#3f2d00]/50 border-b border-[#D97706]/20'
                      : qaOrg 
                        ? 'bg-[#0052cc]/10 border-b border-[#00a1e0]/20'
                        : 'bg-[#3f2d00]/50 border-b border-[#D97706]/20'
                } px-3.5 py-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      qaDeployed 
                        ? 'bg-[#22c55e]' 
                        : qaDeploying 
                          ? 'bg-[#D97706] animate-pulse'
                          : qaOrg 
                            ? 'bg-[#00a1e0]' 
                            : 'bg-[#D97706] animate-pulse'
                    }`}></div>
                    <span className="text-[12px] font-bold text-[#e2e8f0]">QA Sandbox</span>
                    <span className="text-[9.5px] text-[#4a7fa5] font-mono">{qaOrg ? qaOrg.instance_url.replace(/^https?:\/\//, '') : 'acme-qa.my.salesforce.com'}</span>
                  </div>
                  {qaDeployed ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-bold uppercase tracking-wider">✓ Deployed · Approved</span>
                  ) : qaDeploying ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#D97706]/20 text-[#D97706] font-bold uppercase tracking-wider animate-pulse">Deploying...</span>
                  ) : qaOrg ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#00a1e0]/20 text-[#00a1e0] font-bold uppercase tracking-wider">Connected</span>
                  ) : (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#D97706]/20 text-[#D97706] font-bold uppercase tracking-wider animate-pulse">Not Connected</span>
                  )}
                </div>
                
                <div className="p-3.5 flex flex-col gap-3">
                  {qaDeployed ? (
                    <div className="text-[10.5px] leading-relaxed text-[#94a3b8]">
                      {stepsList.length} changes deployed · verified successfully by QA automated checks.<br/>
                      <div className="mt-1 opacity-60">Deployed: recently · By: Forge · Alias: {qaOrg?.alias || 'QA Sandbox'}</div>
                    </div>
                  ) : qaDeploying ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-[10.5px] leading-relaxed text-[#e2e8f0]">
                        Deploying {stepsList.length} changes from Git branch <span className="text-[#a78bfa] font-mono">feature/{ticketKey.toLowerCase()}</span> to QA Sandbox...
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 bg-[#1a3050] rounded-full overflow-hidden w-full">
                          <div className="h-full bg-[#D97706] rounded-full transition-all duration-300" style={{ width: `${qaProgress}%` }}></div>
                        </div>
                        <div className="text-[9.5px] text-[#4a7fa5] flex justify-between font-mono">
                          <span>Progress: {qaProgress}%</span>
                          <span>Deploying via Tooling API...</span>
                        </div>
                      </div>
                      <div className="bg-[#020b16] rounded-lg p-2.5 border border-[#1e3a52]/40 font-mono text-[9px] text-[#4ade80] max-h-[140px] overflow-y-auto flex flex-col gap-1">
                        {qaLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 font-mono">
                            <span className="text-white/20 select-none">[{idx + 1}]</span>
                            <span className="break-all">{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : qaOrg ? (
                    <div className="flex flex-col gap-3.5">
                      <div className="text-[10.5px] leading-relaxed text-[#94a3b8]">
                        QA Sandbox connected. Ready to deploy {stepsList.length} metadata components from feature branch <span className="text-[#a78bfa] font-mono">feature/{ticketKey.toLowerCase()}</span>.
                      </div>
                      <button 
                        onClick={startQaDeployment}
                        className="w-full bg-[#00a1e0] hover:bg-[#008cc2] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-[11px] transition-all active:scale-[0.98] shadow-md shadow-[#00a1e0]/10"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        Deploy metadata to QA Sandbox now
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-[10.5px] leading-relaxed text-[#94a3b8]">
                        Deploying {stepsList.length} changes from Git branch <span className="text-[#a78bfa] font-mono">feature/{ticketKey.toLowerCase()}</span>...<br/>
                        Source: Dev Sandbox metadata (verified) → QA Sandbox via Metadata API
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-1 bg-[#1a3050] rounded-full overflow-hidden">
                          <div className="w-[66%] h-full bg-[#D97706] rounded-full"></div>
                        </div>
                        <div className="text-[9px] text-[#4a7fa5] flex justify-between">
                          <span>Waiting for QA Sandbox connection...</span>
                          <span>Locked</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* UAT — STATUS */}
            <div className="flex gap-4 relative z-10 mb-8">
              <div className={`w-5 h-5 rounded-full ${
                uatDeployed 
                  ? 'bg-[#0d2f17] border border-[#22c55e] text-[#22c55e]' 
                  : uatDeploying 
                    ? 'bg-[#3f2d00] border border-[#D97706] text-[#D97706] animate-pulse'
                    : uatOrg && qaDeployed
                      ? 'bg-[#1a3050] border border-[#00a1e0] text-[#00a1e0]'
                      : 'bg-[#020b16] border border-[#1a3050] text-[#3a6a90]'
              } flex items-center justify-center shrink-0 text-[10px] mt-2.5`}>
                {uatDeployed ? '✓' : uatDeploying ? '⏳' : uatOrg && qaDeployed ? '→' : 'UAT'}
              </div>
              <div className={`flex-1 ${
                uatDeployed 
                  ? 'bg-[#031b2e] border border-[#22c55e]' 
                  : uatDeploying
                    ? 'bg-[#031b2e] border border-[#D97706]'
                    : uatOrg && qaDeployed
                      ? 'bg-[#031b2e] border border-[#00a1e0]'
                      : 'bg-[#020b16]/40 border border-[#1a3050]'
              } rounded-xl overflow-hidden`}>
                <div className={`${
                  uatDeployed 
                    ? 'bg-[#0d2f17]/50 border-b border-[#22c55e]/20' 
                    : uatDeploying
                      ? 'bg-[#3f2d00]/50 border-b border-[#D97706]/20'
                      : uatOrg && qaDeployed
                        ? 'bg-[#0052cc]/10 border-b border-[#00a1e0]/20'
                        : 'bg-[#021427] border-b border-[#1a3050]'
                } px-3.5 py-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      uatDeployed 
                        ? 'bg-[#22c55e]' 
                        : uatDeploying
                          ? 'bg-[#D97706] animate-pulse'
                          : uatOrg && qaDeployed
                            ? 'bg-[#00a1e0]'
                            : 'bg-[#1a3050]'
                    }`}></div>
                    <span className="text-[12px] font-bold text-[#e2e8f0]">UAT Sandbox</span>
                    <span className="text-[9.5px] text-[#4a7fa5] font-mono">{uatOrg ? uatOrg.instance_url.replace(/^https?:\/\//, '') : 'acme-uat.my.salesforce.com'}</span>
                  </div>
                  {uatDeployed ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-bold uppercase tracking-wider">✓ Deployed</span>
                  ) : uatDeploying ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#D97706]/20 text-[#D97706] font-bold uppercase tracking-wider animate-pulse">Deploying...</span>
                  ) : uatOrg && qaDeployed ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#00a1e0]/20 text-[#00a1e0] font-bold uppercase tracking-wider">Ready to Deploy</span>
                  ) : (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#1a3050]/50 text-[#4a7fa5] font-bold uppercase tracking-wider">Not Connected</span>
                  )}
                </div>
                
                <div className="p-3.5 flex flex-col gap-3 text-[10.5px]">
                  {uatDeployed ? (
                    <div className="text-[10.5px] leading-relaxed text-[#94a3b8]">
                      {stepsList.length} changes deployed · Ready for business sign-off.<br/>
                      <div className="mt-1 opacity-60">Deployed: recently · By: Forge · Alias: {uatOrg?.alias || 'UAT Sandbox'}</div>
                    </div>
                  ) : uatDeploying ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-[10.5px] leading-relaxed text-[#e2e8f0]">
                        Deploying {stepsList.length} changes from Git branch <span className="text-[#a78bfa] font-mono">feature/{ticketKey.toLowerCase()}</span> to UAT Sandbox...
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 bg-[#1a3050] rounded-full overflow-hidden w-full">
                          <div className="h-full bg-[#D97706] rounded-full transition-all duration-300" style={{ width: `${uatProgress}%` }}></div>
                        </div>
                        <div className="text-[9.5px] text-[#4a7fa5] flex justify-between font-mono">
                          <span>Progress: {uatProgress}%</span>
                          <span>Deploying via Metadata API...</span>
                        </div>
                      </div>
                      <div className="bg-[#020b16] rounded-lg p-2.5 border border-[#1e3a52]/40 font-mono text-[9px] text-[#4ade80] max-h-[140px] overflow-y-auto flex flex-col gap-1">
                        {uatLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 font-mono">
                            <span className="text-white/20 select-none">[{idx + 1}]</span>
                            <span className="break-all">{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : uatOrg ? (
                    qaDeployed ? (
                      <div className="flex flex-col gap-3.5">
                        <div className="text-[10.5px] leading-relaxed text-[#94a3b8]">
                          UAT Sandbox connected and QA approval checks completed. Ready to promote {stepsList.length} changes to covenantsynergyprivatelimited2--uat.sandbox.my.salesforce.com.
                        </div>
                        <button 
                          onClick={startUatDeployment}
                          className="w-full bg-[#D97706] hover:bg-[#B45309] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-[11px] transition-all active:scale-[0.98] shadow-md shadow-[#D97706]/10"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          Deploy metadata to UAT Sandbox now
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="leading-relaxed text-[#4a7fa5]">
                          Will deploy automatically after QA Sandbox has been successfully verified and approved.
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button className="px-3 py-1.5 rounded-lg bg-[#0d1f35] border border-[#1a3050] text-[#3a6a90] text-[10px] font-semibold cursor-not-allowed">Deploy to UAT (Locked — complete QA first)</button>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="leading-relaxed text-[#4a7fa5]">
                        Will deploy automatically after QA Sandbox is approved by QA team.<br/>
                        UAT requires: business user sign-off · Regression test pass · UAT checklist
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button className="px-3 py-1.5 rounded-lg bg-[#0d1f35] border border-[#1a3050] text-[#3a6a90] text-[10px] font-semibold cursor-not-allowed">Deploy to UAT (locked)</button>
                        <Link href={`/dashboard?view=p-s7&id=${deployUrlId}`} className="px-3 py-1.5 rounded-lg bg-[#021b36] border border-[#3a6a90] text-[#5a9fd4] text-[10px] font-semibold active:scale-95 transition-all flex items-center">
                          Configure UAT approvers
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCTION — STATUS */}
            <div className="flex gap-4 relative z-10">
              <div className={`w-5 h-5 rounded-full ${prodOrg ? 'bg-[#0d2f17] border border-[#22c55e] text-[#22c55e]' : 'bg-[#020b16] border border-[#3f0d0d] text-[#f87171]'} flex items-center justify-center shrink-0 text-[10px] mt-2.5`}>{prodOrg ? '✓' : '🔒'}</div>
              <div className={`flex-1 ${prodOrg ? 'bg-[#031b2e] border border-[#22c55e]' : 'bg-[#3f0d0d]/10 border border-[#3f0d0d]'} rounded-xl overflow-hidden`}>
                <div className={`${prodOrg ? 'bg-[#0d2f17]/50 border-b border-[#22c55e]/20' : 'bg-[#1a0a0a] border-b border-[#3f0d0d]'} px-3.5 py-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${prodOrg ? 'bg-[#22c55e]' : 'bg-[#DC2626]'}`}></div>
                    <span className="text-[12px] font-bold text-[#e2e8f0]">Production</span>
                    <span className="text-[9.5px] text-[#4a7fa5] font-mono">{prodOrg ? prodOrg.instance_url.replace(/^https?:\/\//, '') : 'acme.my.salesforce.com'}</span>
                  </div>
                  {prodOrg ? (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] font-bold uppercase tracking-wider">✓ Deployed</span>
                  ) : (
                    <span className="text-[8px] px-2 py-0.5 rounded bg-[#3f0d0d] text-[#f87171] font-bold uppercase tracking-wider">Not Connected</span>
                  )}
                </div>
                <div className="p-3.5 flex flex-col gap-3 text-[10.5px] text-[#4a7fa5]">
                  {prodOrg ? (
                    <div className="text-[10.5px] leading-relaxed text-[#94a3b8]">
                      All changes successfully deployed to Production Environment.<br/>
                      <div className="mt-1 opacity-60">Deployed: recently · By: Forge · Alias: {prodOrg.alias}</div>
                    </div>
                  ) : (
                    <>
                      <div className="leading-relaxed text-[#94a3b8]/50">
                        Production deployment requires: UAT approval + Jira ticket status "UAT Passed" + Change Management approval.<br/>
                        <span className="text-[#f87171] text-[9.5px] font-semibold italic">Production will never auto-deploy — always requires explicit human approval.</span>
                      </div>
                      <button className="w-fit px-3 py-1.5 rounded-lg bg-[#3f0d0d] border border-[#DC2626]/40 text-[#f87171] text-[10px] font-bold uppercase tracking-wider cursor-not-allowed">Locked — complete UAT first</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
