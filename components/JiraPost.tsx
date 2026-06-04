'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrg } from '@/lib/supabase-helpers';

function generateAcceptanceCriteria(plan: any): string[] {
  if (!plan) return [
    'Referral_Partner__c field exists on Opportunity object',
    'Field visible in "Key Information" section of Opportunity Layout',
    'Lookup filters to Account records with Partner record type only',
    'Report "Pipeline by Referral Partner" exists in Sales Reports folder',
    'Existing Opportunity records unaffected (field empty by default)'
  ];

  const explicit = plan.acceptanceCriteria || plan.acceptance_criteria || plan.criteria;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit;
  }

  const items = plan.items || plan.steps || [];
  if (items.length === 0) {
    return [
      'Implementation plan items created successfully',
      'All proposed metadata objects compile in Salesforce Sandbox',
      'Declarative and custom configurations validated'
    ];
  }

  const criteria: string[] = [];
  items.forEach((item: any) => {
    let name = item.fullName || item.name || '';
    let type = item.type || '';
    
    if (type === 'CustomObject') {
      const label = item.metadata?.label || name.replace(/__c$/, '');
      criteria.push(`Custom Object "${name}" exists on target Salesforce org (Label: "${label}")`);
    } else if (type === 'CustomField') {
      const parts = name.split('.');
      const fieldName = parts[1] || name;
      const objName = parts[0] || 'Target Object';
      const label = item.metadata?.label || fieldName.replace(/__c$/, '');
      const fType = item.metadata?.type || 'Text';
      criteria.push(`Custom Field "${fieldName}" exists on ${objName} (Label: "${label}", Type: ${fType})`);
    } else if (type === 'ApexClass') {
      criteria.push(`Apex Class "${name}" compiles successfully in target namespace`);
      criteria.push(`Apex Test Class code coverage for "${name}" meets or exceeds 75% threshold`);
    } else if (type === 'Layout') {
      criteria.push(`Page Layout "${name}" updated and visible to all target profiles`);
    } else {
      const itemTitle = item.title || name || 'Metadata change';
      criteria.push(`Metadata component "${itemTitle}" (${type || 'Custom'}) deployed successfully`);
    }
  });

  criteria.push('Verify that no existing production records are impacted by deployment');
  return criteria;
}

export function JiraPost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importTicket = searchParams?.get('importTicket');
  const supabase = createClient();

  const [org, setOrg] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [projectKey, setProjectKey] = useState('SFDC');
  const [summary, setSummary] = useState('');
  const [assignee, setAssignee] = useState('Unassigned');
  const [sprint, setSprint] = useState('Active Sprint 24');
  const [triggerType, setTriggerType] = useState('auto-deploy');


  useEffect(() => {
    async function loadPlanData() {
      try {
        // 1. Fetch connected org
        const activeOrg = await getActiveOrg(supabase);
        if (activeOrg) setOrg(activeOrg);

        // 2. Fetch connection details to prefill project key
        const { data: conn } = await supabase
          .from('jira_connections')
          .select('project_key, site_url')
          .limit(1)
          .maybeSingle();

        if (conn?.project_key) {
          setProjectKey(conn.project_key);
        }

        let activePlan = null;
        let activeSummary = '';

        if (importTicket) {
          const res = await fetch(`/api/jira/ticket?key=${importTicket}`);
          if (res.ok) {
            const data = await res.json();
            if (data.plan) {
              activePlan = data.plan;
              activeSummary = data.ticket.summary;
            }
          }
        }

        if (!activePlan) {
          // 3. Fetch most recent AI generated plan from database messages
          const { data: plansData } = await supabase
            .from('messages')
            .select('*')
            .not('implementation_plan', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (plansData && plansData.length > 0) {
            activePlan = typeof plansData[0].implementation_plan === 'string'
              ? JSON.parse(plansData[0].implementation_plan)
              : plansData[0].implementation_plan;
          }

          if (activePlan) {
            activeSummary = `[Salesforce] ${activePlan.summary || 'AI Implementation Plan'}`;
          }
        }

        if (activePlan) {
          setPlan(activePlan);
          setSummary(activeSummary);
        }
      } catch (err) {
        console.error('Failed to load active plan details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPlanData();
  }, []);

  const handlePostTicket = async () => {
    setPosting(true);
    try {
      const activePlan = plan;

      // Explicitly bundle the dynamic/explicit acceptance criteria inside plan data
      const planToPost = {
        ...activePlan,
        acceptanceCriteria: acceptanceCriteriaToRender
      };

      const res = await fetch('/api/jira/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectKey: projectKey || 'SFDC',
          summary,
          plan: planToPost,
          orgId: org?.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to post ticket');
      }

      router.push('/dashboard?view=jira-board&posted=true');
    } catch (err: any) {
      console.error(err);
      alert('Error posting to Jira: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  // High fidelity default items when no plan resides in database
  const defaultSteps = [
    { num: 1, title: 'Create field: Referral_Partner__c on Opportunity', detail: 'Type: Lookup → Account (Partner record type only) · Label: "Referred by Partner" · Required: No', api: 'Metadata API · CustomField' },
    { num: 2, title: 'Add field to "Opportunity Layout" page layout', detail: 'Section: Key Information (row 3, col 1) · All record types · Edit permission', api: 'Metadata API · Layout' },
    { num: 3, title: 'Create report: "Pipeline by Referral Partner"', detail: 'Summary report · Opportunity · Grouped by Referral_Partner__c · Is Open = True · Sales Reports folder', api: 'Report API' }
  ];

  const stepsToRender = plan?.steps || plan?.items || defaultSteps;

  const defaultRisk = [
    '✅ No existing data will be modified or deleted',
    '✅ No Apex code — purely declarative changes',
    '✅ Estimated deployment time: <60 seconds',
    '✅ Rollback available for 24 hours post-deployment',
    '⚠ Sandbox testing recommended before Production'
  ];

  const defaultAcceptance = [
    'Referral_Partner__c field exists on Opportunity object',
    'Field visible in "Key Information" section of Opportunity Layout',
    'Lookup filters to Account records with Partner record type only',
    'Report "Pipeline by Referral Partner" exists in Sales Reports folder',
    'Existing Opportunity records unaffected (field empty by default)'
  ];

  const acceptanceCriteriaToRender = plan?.acceptanceCriteria || plan?.acceptance_criteria || generateAcceptanceCriteria(plan);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0a1628] text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#0052CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <div className="text-[12px] font-bold tracking-wide">Compiling ticket preview...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge AI Builder</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52]">
          <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">{org?.alias || 'Acme Corp · Production'}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
            <span className="text-[9px] text-[#22c55e]">Connected · Jira linked</span>
          </div>
        </div>
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-2">LINKED JIRA</div>
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] bg-[#0d2137] text-[#00A1E0] border-l-2 border-[#0052CC] cursor-pointer font-bold">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span className="truncate flex-1">Post Jira ticket</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#3f2d00] text-[#FCD34D] font-bold">Draft</span>
        </div>
        <Link href="/dashboard?view=jira-board" className="flex items-center gap-2 px-4 py-2 text-[11px] text-[#7CC4E4] hover:bg-[#0d2137] transition-all cursor-pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          <span className="truncate flex-1">Jira board</span>
          <span className="text-[9px] opacity-50">6</span>
        </Link>
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-4">NAVIGATION</div>
        <Link href="/dashboard?view=plan" className="flex items-center gap-2 px-4 py-2 text-[11px] text-[#7CC4E4] hover:bg-[#0d2137] transition-all cursor-pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span className="truncate">← Back to plan</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#050b16]">
        {/* Inner Top Bar */}
        <div className="h-[60px] bg-[#021427] border-b border-[#1e3a52] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-[#0052CC] rounded-full shrink-0"></div>
            <div className="text-[14px] font-bold text-white truncate">Post to Jira — {summary.replace(/^\[Salesforce\]\s*/, '')}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-[#0052CC] px-3 py-1 rounded">
              Jira connected
            </span>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="max-w-[900px] mx-auto w-full space-y-6">
            


            {/* Ticket Preview Card */}
            <div className="bg-[#021427] border border-[#0052CC] rounded-2xl overflow-hidden shadow-2xl shrink-0">
              <div className="bg-[#0052CC] px-5 py-3.5 flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div className="text-[12px] font-extrabold text-white flex-1">Jira ticket — auto-generated by Forge AI</div>
                <span className="text-[9px] text-[#B3D4FF] font-bold tracking-wider uppercase">Project: {projectKey} · Story</span>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-[#4a7fa5] uppercase tracking-widest">Ticket Title</label>
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-[#050b16] border border-[#1e3a52] rounded-xl px-4 py-3 text-[13px] text-white font-bold outline-none focus:border-[#0052CC] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0d2137] rounded-xl p-3 border border-[#1e3a52]/40 flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-[#4a7fa5] uppercase tracking-widest">Type</label>
                    <div className="text-[11px] font-extrabold text-white">Story</div>
                  </div>
                  <div className="bg-[#0d2137] rounded-xl p-3 border border-[#1e3a52]/40 flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-[#4a7fa5] uppercase tracking-widest">Priority</label>
                    <div className="text-[11px] font-extrabold text-[#FCD34D]">{plan?.riskLevel?.toLowerCase()?.includes('high') ? 'High' : 'Medium'}</div>
                  </div>
                  <div className="bg-[#0d2137] rounded-xl p-3 border border-[#1e3a52]/40 flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-[#4a7fa5] uppercase tracking-widest">Story Points</label>
                    <div className="text-[11px] font-extrabold text-white">{stepsToRender.length || 1}</div>
                  </div>
                  <div className="bg-[#0d2137] rounded-xl p-3 border border-[#1e3a52]/40 flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-[#4a7fa5] uppercase tracking-widest">Assignee</label>
                    <select 
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="bg-transparent text-[11px] text-white font-bold outline-none border-none p-0 appearance-none cursor-pointer"
                    >
                      <option>Unassigned</option>
                      <option>Ravi Kumar</option>
                      <option>Priya Sharma</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-[#4a7fa5] uppercase tracking-widest">Description (auto-generated by Forge)</label>
                  <div className="bg-[#0d2137] rounded-xl p-5 border border-[#1e3a52]/30 space-y-4">
                    <div>
                      <div className="text-[11px] font-extrabold text-[#7CC4E4] uppercase tracking-wider mb-1.5">Summary</div>
                      <div className="text-[11px] text-[#e2e8f0] leading-relaxed">
                        {plan?.summary || 'Add partner referral tracking Opportunity lookup and analytics dashboard.'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-[11px] font-extrabold text-[#7CC4E4] uppercase tracking-wider mb-2">Salesforce changes ({stepsToRender.length} items)</div>
                      <div className="bg-[#031b2e] rounded-xl overflow-hidden border border-[#1a3050]">
                        {stepsToRender.map((step: any, i: number) => {
                          const stepNum = step.num || (i + 1);
                          const stepTitle = step.title || step.fullName || `Create custom metadata ${step.name || ''}`;
                          const stepDetail = step.detail || step.desc || `Deploying type: ${step.type || 'Custom'}`;
                          const stepBadge = step.api || `Metadata API · ${step.type || 'CustomField'}`;
                          
                          return (
                            <div key={i} className="flex gap-4 p-4 border-b border-[#0d1f35] last:border-none hover:bg-white/[0.02] transition-colors">
                              <div className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[9.5px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                {stepNum}
                              </div>
                              <div className="flex-1">
                                <div className="text-[11px] font-bold text-white mb-0.5">{stepTitle}</div>
                                <div className="text-[9.5px] text-[#7da5c9] leading-relaxed mb-2">{stepDetail}</div>
                                <span className="text-[8px] font-extrabold px-2.5 py-0.5 rounded bg-[#021427] text-[#0052CC] border border-[#1e3a52]/40 uppercase tracking-widest">{stepBadge}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-[#7CC4E4] uppercase tracking-wider mb-2">Risk assessment</div>
                      <div className="bg-[#0d2f17]/60 rounded-xl p-4 text-[10px] text-[#a3e8b8] leading-relaxed border border-[#15803D]/20 space-y-1">
                        {defaultRisk.map((riskLine, i) => (
                          <div key={i}>{riskLine}</div>
                        ))}
                      </div>
                    </div>
                    <div className="text-[9px] text-[#4a7fa5] italic pt-1">Generated by Forge AI · Conversation ID: #FRG-2841</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-[#4a7fa5] uppercase tracking-widest">Acceptance Criteria (auto-generated)</label>
                  <div className="bg-[#0d2137] rounded-xl p-4 text-[11px] text-[#e2e8f0] leading-relaxed border border-[#1e3a52]/30 space-y-2">
                    {acceptanceCriteriaToRender.map((crit: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[#0052CC] font-bold shrink-0">□</span>
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-[#4a7fa5] uppercase tracking-widest">Labels</label>
                  <div className="flex gap-2 flex-wrap">
                    {["salesforce", "forge-ai", "opportunity", "declarative"].map((label, i) => (
                      <span key={i} className="text-[8.5px] font-extrabold px-3 py-1 rounded bg-[#032D60] text-[#7CC4E4] uppercase tracking-wider border border-[#1e3a52]/40">{label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                <div className="text-[10px] font-extrabold text-[#4a7fa5] uppercase tracking-widest">Edit Before Posting</div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#7da5c9] font-medium">Sprint</label>
                    <select 
                      value={sprint}
                      onChange={(e) => setSprint(e.target.value)}
                      className="bg-[#021427] border border-[#1e3a52] rounded-xl px-4 py-2.5 text-[11px] text-[#e2e8f0] outline-none cursor-pointer focus:border-[#0052CC]"
                    >
                      <option>Sprint 24 (current)</option>
                      <option>Sprint 25</option>
                      <option>Backlog</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#7da5c9] font-medium">Project Key</label>
                    <input 
                      type="text"
                      value={projectKey}
                      onChange={(e) => setProjectKey(e.target.value)}
                      className="bg-[#021427] border border-[#1e3a52] rounded-xl px-4 py-2.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#0052CC]"
                      placeholder="e.g. SFDC"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0d2137] border border-[#1e3a52]/40 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                <div className="bg-[#031b2e] px-5 py-3.5 flex items-center gap-2 border-b border-[#1e3a52]/30 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  <span className="text-[11px] font-extrabold text-[#7CC4E4] uppercase tracking-widest">Auto-deploy trigger</span>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {[
                    { label: "Deploy to Sandbox automatically on approval", val: "auto-deploy" },
                    { label: "Deploy to Production automatically on approval", val: "prod-deploy" },
                    { label: "Notify in Forge only — deploy manually", val: "manual" }
                  ].map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${triggerType === opt.val ? 'border-[#0052CC] bg-[#0052CC]' : 'border-[#1e3a52] group-hover:border-[#4a7fa5]'}`}>
                        {triggerType === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      <span className="text-[11px] text-[#e2e8f0] font-medium leading-normal">{opt.label}</span>
                      <input 
                        type="radio" 
                        name="trigger" 
                        className="hidden" 
                        checked={triggerType === opt.val} 
                        onChange={() => setTriggerType(opt.val)} 
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-3 pb-12">
              <button 
                onClick={handlePostTicket}
                disabled={posting}
                className="w-full bg-[#0052CC] hover:bg-[#0047b3] text-white font-extrabold py-4 rounded-xl text-[13px] uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-[#0052CC]/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {posting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                    <span>Posting to Jira...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>Post to Jira · {projectKey} project</span>
                  </>
                )}
              </button>
              <Link 
                href="/dashboard?view=plan"
                className="w-full bg-[#1e3a52] hover:bg-[#2c5375] text-[#7CC4E4] font-extrabold py-3.5 rounded-xl text-[12px] uppercase tracking-wider flex items-center justify-center transition-all active:scale-[0.98]"
              >
                ← Back to plan — deploy directly without Jira
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
