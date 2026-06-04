'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrg } from '@/lib/supabase-helpers';

function generateAcceptanceCriteria(plan: any): string[] {
  if (!plan) return [
    'Referral_Partner__c lookup field exists on Opportunity',
    'Lookup filter restricts to Partner record type only',
    'Field visible in Opportunity Layout — Key Information section',
    'Report "Pipeline by Referral Partner" in Sales Reports folder'
  ];

  const explicit = plan.acceptanceCriteria || plan.acceptance_criteria || plan.criteria;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit;
  }

  const items = plan?.items || plan?.steps || [];
  if (!Array.isArray(items) || items.length === 0) {
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

export function JiraApprove() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id') || 'mock-sfdc-109';
  const supabase = createClient();

  const [deployment, setDeployment] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  const [errorState, setErrorState] = useState<string | null>(null);

useEffect(() => {
    async function loadDeploymentData() {
      try {
        // Load Org
        const activeOrg = await getActiveOrg(supabase);
        if (activeOrg) setOrg(activeOrg);

        if (deployId.startsWith('mock-')) {
          // Pre-populate mock deployment structure
          setDeployment({
            id: deployId,
            jira_ticket_id: 'SFDC-109',
            status: 'In review',
            rollback_metadata: JSON.stringify({
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
                'Report "Pipeline by Referral Partner" in Sales Reports folder'
              ]
            })
          });
          setTicketDetails({
            key: 'SFDC-109',
            summary: 'Add partner referral tracking to Opportunity — Referral_Partner__c lookup + Report',
            description: '',
            status: 'In review',
            priority: 'Low',
            assigneeName: 'Ravi Kumar',
            assigneeInitials: 'RK',
            created: new Date().toISOString(),
            comments: []
          });
        } else {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deployId);

          if (isUuid) {
            // Fetch real deployment record from Supabase
            const { data: depData } = await supabase
              .from('deployments')
              .select('*')
              .eq('id', deployId)
              .maybeSingle();

            if (depData) {
              // If the deployment has a jira_ticket_id, secondary-fetch the live ticket plan and details!
              if (depData.jira_ticket_id) {
                try {
                  const res = await fetch(`/api/jira/ticket?key=${depData.jira_ticket_id}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.plan) {
                      setDeployment({
                        ...depData,
                        status: data.ticket?.status || depData.status,
                        rollback_metadata: JSON.stringify(data.plan)
                      });
                      setTicketDetails(data.ticket);
                    } else {
                      setDeployment(depData);
                    }
                  } else {
                    setDeployment(depData);
                  }
                } catch (ticketErr) {
                  console.error('Failed to sync live Jira ticket plan:', ticketErr);
                  setDeployment(depData);
                }
              } else {
                setDeployment(depData);
              }
            } else {
              setErrorState('Deployment record not found.');
            }
          } else {
            // It is a real Jira Ticket key (e.g. SCRUM-5)! Let's load the plan from Atlassian live API!
            const res = await fetch(`/api/jira/ticket?key=${deployId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.plan) {
                setTicketDetails(data.ticket);
                if (data.deployment) {
                  setDeployment({
                    ...data.deployment,
                    status: data.ticket?.status || data.deployment.status,
                    rollback_metadata: JSON.stringify(data.plan)
                  });
                } else {
                  setDeployment({
                    id: deployId,
                    jira_ticket_id: data.ticket?.key || deployId,
                    status: data.ticket?.status || 'In review',
                    rollback_metadata: JSON.stringify(data.plan)
                  });
                }
              } else {
                setErrorState('Failed to load live Jira ticket plan.');
              }
            } else {
              setErrorState(`Jira issue "${deployId}" not found in connected project.`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to retrieve deployment status:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDeploymentData();
  }, [deployId]);

  

  const handleDecision = async (decision: 'approved' | 'rejected' | 'changes_requested') => {
    setSubmitting(true);
    try {
      const targetId = deployment?.id || deployId;
      const res = await fetch('/api/jira/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          decision,
          comment
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit approval decision');
      }

      const data = await res.json();
      const realDeploymentId = data.deployment?.id || targetId;

      if (decision === 'approved') {
        // Instantly transition to the deployment logger screen using the real database UUID!
        router.push(`/dashboard?view=deploy&id=${realDeploymentId}`);
      } else {
        router.push('/dashboard?view=jira-board');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error recording decision: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const ticketKeyToUse = ticketDetails?.key || deployment?.jira_ticket_id || deployId;
      const res = await fetch('/api/jira/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketKey: ticketKeyToUse,
          text: comment
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add comment to Jira');
      }

      const data = await res.json();
      if (data.success) {
        // Refresh ticket details to get the newly added comment dynamically!
        const ticketRes = await fetch(`/api/jira/ticket?key=${ticketKeyToUse}`);
        if (ticketRes.ok) {
          const ticketData = await ticketRes.json();
          if (ticketData.success) {
            setTicketDetails(ticketData.ticket);
          }
        }
        setComment('');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error adding comment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefinePlan = async () => {
    if (!comment.trim()) {
      alert('Please type instructions in the text box below to refine the plan (e.g. "change the vehicle identification number field length to 200").');
      return;
    }
    setSubmitting(true);
    try {
      const targetId = deployment?.id || deployId;
      const res = await fetch('/api/jira/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId: targetId,
          prompt: comment
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to refine plan');
      }

      const data = await res.json();
      if (data.success && data.plan) {
        setDeployment((prev: any) => ({
          ...prev,
          rollback_metadata: JSON.stringify(data.plan)
        }));
        setComment('');
        alert('Plan successfully refined by Forge AI! The Salesforce changes list has been updated.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error refining plan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0a1628] text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#0052CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <div className="text-[12px] font-bold tracking-wide">Syncing DevOps ticket...</div>
        </div>
      </div>
    );
  }

  // Parse plan stashed inside rollback_metadata
  let planData: any = null;
  try {
    if (deployment?.rollback_metadata) {
      const parsed = typeof deployment.rollback_metadata === 'string'
        ? JSON.parse(deployment.rollback_metadata)
        : deployment.rollback_metadata;
      
      if (parsed?.plan) {
        planData = parsed.plan;
      } else {
        planData = parsed?.steps || parsed?.items ? parsed : parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stashed metadata plan:', e);
  }

  const ticketKey = ticketDetails?.key || deployment?.jira_ticket_id || 'SFDC-109';
  const ticketTitle = ticketDetails?.summary || planData?.summary || 'Add partner referral tracking Opportunity lookup and analytics dashboard';
  const stepsToRender = planData?.steps || planData?.items || [
    { num: 1, title: 'Create field: Referral_Partner__c on Opportunity', detail: 'Type: Lookup → Account (Partner record type filter) · Label: "Referred by Partner" · Required: No', api: 'Metadata API · CustomField' },
    { num: 2, title: 'Update page layout: "Opportunity Layout"', detail: 'Add field to Key Information section (row 3, column 1) · All record types · Edit mode', api: 'Metadata API · Layout' },
    { num: 3, title: 'Create report: "Pipeline by Referral Partner"', detail: 'Summary report · Opportunity · Grouped by Referral_Partner__c · Filter: Is Open = True · Folder: Sales Reports', api: 'Report API' }
  ];
  const acceptanceToRender = planData?.acceptanceCriteria || planData?.acceptance_criteria || generateAcceptanceCriteria(planData);

  return (
    <div className="flex flex-1 flex-col bg-[#0a1628] text-[#e2e8f0] font-sans overflow-hidden">
      {/* Jira Top Nav */}
      <div className="h-[50px] bg-[#0052CC] px-6 flex items-center gap-3 shrink-0 shadow-lg">
        <div className="text-[14px] font-black text-white tracking-tight">Jira Software</div>
        <span className="text-[#B3D4FF] text-[13px] opacity-40">/</span>
        <div className="text-[12px] font-bold text-[#B3D4FF]">{ticketKey} · {ticketTitle}</div>
        <div className="ml-auto flex items-center gap-3">
          <div className="bg-[#032D60] text-[#7CC4E4] text-[8.5px] font-extrabold px-3 py-1 rounded-md flex items-center gap-1.5 border border-[#7CC4E4]/10">
            <div className="w-1.5 h-1.5 bg-[#7CC4E4] rounded-full"></div>
            ⚡ FORGE AI
          </div>
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/10 shrink-0">
            {ticketDetails?.assigneeInitials || 'RK'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#050b16]">
        
        {/* Ticket Main Body */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-[#1e3a52]/40 no-scrollbar">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-[10px] font-extrabold font-mono text-[#0052CC] uppercase tracking-wider">{ticketKey}</span>
              <span className="text-[8.5px] font-extrabold px-2.5 py-0.5 rounded bg-[#3f2d00] text-[#FCD34D] border border-[#D97706]/20 uppercase tracking-widest">{deployment?.status || 'IN REVIEW'}</span>
              <span className="ml-auto text-[9.5px] font-bold text-[#4a7fa5] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Posted by Forge AI
              </span>
            </div>
            <h1 className="text-[18px] font-bold text-white leading-tight mb-3">{ticketTitle}</h1>
            <div className="flex gap-3 flex-wrap items-center text-[10px] text-[#7da5c9] font-semibold">
              <span className="bg-[#031b2e] px-2 py-0.5 rounded text-[#7CC4E4] border border-[#1e3a52]/30 uppercase tracking-wider">Story</span>
              <span className="w-1 h-1 rounded-full bg-[#1e3a52]"></span>
              <span>{stepsToRender.length} points</span>
              <span className="w-1 h-1 rounded-full bg-[#1e3a52]"></span>
              <span>Sprint 24</span>
              <span className="w-1 h-1 rounded-full bg-[#1e3a52]"></span>
              <span>Assignee: {ticketDetails?.assigneeName || 'Ravi Kumar'}</span>
              <span className="w-1 h-1 rounded-full bg-[#1e3a52]"></span>
              <span className="text-[#FCD34D] font-bold uppercase tracking-wider bg-[#3f2d00]/30 px-2 py-0.5 rounded border border-[#D97706]/20">
                {ticketDetails?.priority ? `${ticketDetails.priority} Priority` : 'Medium Priority'}
              </span>
            </div>
          </div>

          {/* Awaiting Approval Banner */}
          {deployment?.status?.toLowerCase()?.includes('review') && (
            <div className="bg-[#3f2d00]/60 border border-[#D97706]/40 rounded-2xl p-4 mb-6 flex items-start gap-4 shadow-xl">
              <div className="w-6 h-6 rounded-full bg-[#FCD34D]/15 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div className="text-[12px] font-bold text-[#FCD34D] mb-1">Awaiting your approval — Ravi Kumar (Tech Lead)</div>
                <p className="text-[10.5px] text-[#7da5c9] leading-relaxed">
                  Forge AI has prepared this Salesforce implementation. Review the changes below and approve to trigger automatic deployment to Sandbox. No Salesforce access needed to review.
                </p>
              </div>
            </div>
          )}

          {/* Salesforce Changes */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#7CC4E4] uppercase tracking-widest mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A1E0" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Salesforce changes ({stepsToRender.length} items) — generated by Forge AI
            </div>
            <div className="bg-[#031b2e] border border-[#1e3a52]/40 rounded-2xl overflow-hidden shadow-xl">
              {stepsToRender.map((step: any, i: number) => {
                const stepNum = step.num || (i + 1);
                const stepTitle = step.title || step.fullName || `Create custom metadata ${step.name || ''}`;
                const stepDetail = step.detail || step.desc || `Deploying type: ${step.type || 'Custom'}`;
                const stepBadge = step.api || `Metadata API · ${step.type || 'CustomField'}`;

                return (
                  <div key={i} className="flex gap-4 p-4 border-b border-[#0d1f35] last:border-none hover:bg-white/[0.02] transition-all">
                    <div className="w-5 h-5 rounded-full bg-[#00A1E0] text-white text-[9.5px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{stepNum}</div>
                    <div className="flex-1">
                      <div className="text-[11.5px] font-bold text-white mb-0.5">{stepTitle}</div>
                      <div className="text-[10px] text-[#7da5c9] leading-relaxed mb-2">{stepDetail}</div>
                      <span className="text-[8px] font-extrabold px-2.5 py-0.5 rounded bg-[#021427] text-[#0052CC] uppercase tracking-widest border border-[#1e3a52]/40">{stepBadge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="mb-6">
            <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-widest mb-2">Risk assessment</div>
            <div className="bg-[#031b2e] border border-[#15803D]/25 rounded-2xl p-4 text-[10.5px] text-[#a3e8b8] leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 shadow-md">
              <div className="flex items-center gap-2"><span>✅</span> No existing records will be modified</div>
              <div className="flex items-center gap-2"><span>✅</span> No Apex code — purely declarative</div>
              <div className="flex items-center gap-2"><span>✅</span> No security or sharing rule changes</div>
              <div className="flex items-center gap-2"><span>✅</span> Estimated deployment: &lt;60s</div>
              <div className="flex items-center gap-2"><span>✅</span> Rollback available for 24 hours</div>
              <div className="flex items-center gap-2 text-[#FCD34D]"><span>⚠</span> Recommend: test in Sandbox first</div>
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div className="mb-6">
            <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-widest mb-2">Acceptance criteria</div>
            <div className="bg-[#031b2e] border border-[#1e3a52]/40 rounded-2xl p-4 text-[11px] text-[#e2e8f0] leading-loose shadow-md space-y-2">
              {acceptanceToRender.map((crit: string, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-[3px] border border-[#1e3a52] flex items-center justify-center shrink-0"></div>
                  <span className="text-[11px] font-medium leading-none">{crit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity / Comments Log */}
          <div className="mb-6">
            <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-widest mb-4">Activity Log</div>
            <div className="flex flex-col">
              {[
                { 
                  dotColor: "#0052CC", 
                  time: ticketDetails?.created ? new Date(ticketDetails.created).toLocaleString() : "Today · 9:41 AM", 
                  text: "Forge posted this ticket from implementation plan", 
                  sub: `Status: To Do · Assigned to ${ticketDetails?.assigneeName || 'Ravi Kumar'}` 
                },
                ...(ticketDetails?.comments || []).map((c: any) => ({
                  dotColor: "#7c3aed",
                  time: new Date(c.created).toLocaleString(),
                  text: `${c.author} added a comment`,
                  sub: c.text
                })),
                ...commentsList.map(c => ({
                  dotColor: "#7c3aed",
                  time: c.time,
                  text: `${c.author} added a comment`,
                  sub: c.text
                }))
              ].map((item, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.dotColor }}></div>
                    {i !== arr.length - 1 && <div className="w-px flex-1 bg-[#1e3a52] my-1"></div>}
                  </div>
                  <div className="pb-6">
                    <div className="text-[9px] font-bold text-[#4a7fa5] mb-1">{item.time}</div>
                    <div className="text-[11px] font-bold text-[#e2e8f0] mb-0.5">{item.text}</div>
                    <div className="text-[10px] text-[#7da5c9] mt-0.5 bg-[#031b2e]/45 p-2 rounded-lg border border-[#1e3a52]/20 max-w-[500px] leading-relaxed">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment Box */}
          <div className="mt-4">
            <label className="text-[9.5px] font-bold text-[#4a7fa5] uppercase tracking-widest mb-2 block">Add a comment / Refinement instructions</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-[#0d2137] border border-[#1e3a52] rounded-xl p-3 text-[12px] text-[#e2e8f0] outline-none focus:border-[#0052CC] transition-all resize-none min-h-[64px] mb-3" 
              placeholder="Write a comment or enter refinement instructions (e.g. 'change Vehicle Number length to 250')..."
            />
            <div className="flex gap-2.5">
              <button 
                onClick={handleAddComment}
                className="bg-[#0d1f35] hover:bg-[#1e3a52] border border-[#1e3a52] text-[#7CC4E4] px-4 py-2 rounded-lg text-[10.5px] font-bold transition-all active:scale-95"
              >
                Add Comment
              </button>
              <button 
                onClick={handleRefinePlan}
                disabled={submitting}
                className="bg-[#0052CC] hover:bg-[#0047b3] text-white px-4 py-2 rounded-lg text-[10.5px] font-bold transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" /></svg>
                ) : (
                  <>
                    <span>⚡ Refine Plan with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="h-8"></div>
        </div>

        {/* Approval Panel (Right Sidebar) */}
        <div className="w-full md:w-[280px] bg-[#021427] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto border-t md:border-t-0 md:border-l border-[#1e3a52]/40 no-scrollbar">
          <div>
            <div className="text-[10px] font-black text-[#4a7fa5] uppercase tracking-[0.1em] mb-4">APPROVAL DECISION</div>
            
            <div className="bg-[#0d2f17]/50 border border-[#15803D]/20 rounded-xl p-4 text-[10.5px] text-[#a3e8b8] leading-relaxed mb-4 shadow-lg shadow-[#15803D]/5">
              On approval, Forge will compile changes and auto-deploy to <strong className="text-[#4ade80]">Sandbox</strong> immediately. You can promote to Production after verifying.
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleDecision('approved')}
                disabled={submitting}
                className="w-full bg-[#15803D] hover:bg-[#126932] text-white font-bold py-3.5 rounded-xl text-[12px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-[#15803D]/10 disabled:opacity-50"
              >
                {submitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
                    <span>Approve → Deploy</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => handleDecision('changes_requested')}
                disabled={submitting}
                className="w-full bg-[#0d1f35] hover:bg-[#1e3a52] border border-[#1e3a52] text-[#60a5fa] font-bold py-3.5 rounded-xl text-[12px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Request changes
              </button>
              <button 
                onClick={() => handleDecision('rejected')}
                disabled={submitting}
                className="w-full bg-[#3f0d0d] hover:bg-[#5a1414] text-[#f87171] font-bold py-3.5 rounded-xl text-[12px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Reject — do not deploy
              </button>
            </div>
          </div>

          <div className="h-px bg-[#1e3a52]/40"></div>

          <div>
            <div className="text-[10px] font-black text-[#4a7fa5] uppercase tracking-[0.1em] mb-3">TICKET DETAILS</div>
            <div className="space-y-3">
              {[
                { label: "Status", val: deployment?.status || "In review", isBadge: true, bg: "#3f2d00", color: "#FCD34D" },
                { label: "Priority", val: ticketDetails?.priority || "Medium", color: "#FCD34D" },
                { label: "Story points", val: stepsToRender.length || "1" },
                { label: "Sprint", val: "Sprint 24" },
                { label: "Created", val: ticketDetails?.created ? new Date(ticketDetails.created).toLocaleDateString() : "Today 9:41 AM" },
                { label: "By", val: "⚡ Forge", color: "#0052CC" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#4a7fa5] font-semibold">{item.label}</span>
                  {item.isBadge ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: item.bg, color: item.color }}>{item.val.toUpperCase()}</span>
                  ) : (
                    <span className="font-bold text-[#e2e8f0]" style={{ color: item.color || undefined }}>{item.val}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#1e3a52]/40"></div>

          <div>
            <div className="text-[10px] font-black text-[#4a7fa5] uppercase tracking-[0.1em] mb-3">DEPLOY CONFIG</div>
            <div className="space-y-3">
              {[
                { label: "Trigger", val: "On approval", color: "#4ade80" },
                { label: "Target", val: "Sandbox", color: "#FCD34D" },
                { label: "Rollback", val: "24 hours" },
                { label: "Org", val: org?.alias || "Acme Corp" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#4a7fa5] font-semibold">{item.label}</span>
                  <span className="font-bold text-[#e2e8f0]" style={{ color: item.color || undefined }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Link 
              href="/dashboard?view=plan"
              className="w-full bg-[#0d1f35] border border-[#1e3a52] text-[#7CC4E4] rounded-xl py-3 flex items-center justify-center gap-2.5 text-[11px] font-bold transition-all hover:bg-[#1a3050] active:scale-98 uppercase tracking-wider shadow-md"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              View in Forge
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
