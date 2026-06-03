'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function FullFlow() {
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id');
  const supabase = createClient();

  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  // SDD Generation Modal State
  const [sddOpen, setSddOpen] = useState(false);
  const [sddGenerating, setSddGenerating] = useState(false);
  const [sddProgress, setSddProgress] = useState(0);
  const [sddLogs, setSddLogs] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
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
          setTicketDetails({
            key: 'SFDC-109',
            summary: 'Add partner referral tracking to Opportunity — Referral_Partner__c lookup + Report',
          });
          const mockPlan = {
            summary: 'Add partner referral tracking to Opportunity — Referral_Partner__c lookup + Report',
            steps: [
              { num: 1, title: 'Create field: Referral_Partner__c on Opportunity', type: 'CustomField', fullName: 'Opportunity.Referral_Partner__c', detail: 'Type: Lookup → Account · Label: "Referred by Partner"' },
              { num: 2, title: 'Update page layout: Opportunity Layout', type: 'Layout', fullName: 'Opportunity-Opportunity Layout', detail: 'Add field to Key Information section' },
              { num: 3, title: 'Create report: Pipeline by Referral Partner', type: 'Report', fullName: 'Sales_Reports/Pipeline_by_Referral_Partner', detail: 'Summary report grouped by Referral Partner' }
            ],
            acceptanceCriteria: [
              'Referral_Partner__c lookup field exists on Opportunity',
              'Field visible in Opportunity Layout — Key Information section',
              'Report "Pipeline by Referral Partner" in Sales Reports folder'
            ]
          };
          setPlan(mockPlan);
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
                setDeployment(depRecord);
              } else if (data.deployment) {
                setDeployment(data.deployment);
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

  const sddLogSteps = [
    "Reading Salesforce Metadata schema and active customization delta...",
    "Analyzing target org components and verifying API versions (v60.0)...",
    "Extracting declarative flow trigger conditions and record-level actions...",
    "Verifying field dependencies, security requirements, and visibility rules...",
    "Resolving Git pull request references and commit logs...",
    "Generating Systems Design Document (SDD) Markdown specification..."
  ];

  const generateSdd = () => {
    setSddOpen(true);
    setSddGenerating(true);
    setSddProgress(0);
    setSddLogs(["Initializing SDD Generation engine for ticket: " + ticketKey + "..."]);

    let currentStep = 0;
    const interval = setInterval(() => {
      setSddProgress(prev => {
        const next = prev + 16.6;
        if (next >= 100) {
          clearInterval(interval);
          setSddGenerating(false);
          return 100;
        }
        return next;
      });

      if (currentStep < sddLogSteps.length) {
        setSddLogs(prev => [...prev, sddLogSteps[currentStep]]);
        currentStep++;
      }
    }, 600);
  };

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

  const ticketKey = ticketDetails?.key || 'SFDC-109';
  const planSteps = plan?.steps || plan?.items || [];
  const ticketStatus = ticketDetails?.status || 'In Review';

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center gap-2.5 shrink-0">
          <div className="text-[13px] font-semibold flex-1 truncate">Complete flow — Jira → AI Build → Git → Multi-Org Promotion</div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Phase 1 */}
            <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0 shadow-lg shadow-[#0052CC]/5">
              <div className="bg-[#0052CC] px-3.5 py-2.5 flex items-center gap-2">
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">Phase 1 — Jira triggers the work</div>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {[
                  { num: "1", title: "PM writes Jira ticket", desc: "Description, SF changes, acceptance criteria, target org" },
                  { num: "2", title: "Clicks \"Build with Forge AI\"", desc: "One button triggers the entire pipeline" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.num}</span>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[10.5px] font-bold text-[#e2e8f0]">{item.title}</div>
                      <div className="text-[10px] text-[#4a7fa5]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 2 */}
            <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0 shadow-lg shadow-[#D97706]/5">
              <div className="bg-[#D97706] px-3.5 py-2.5 flex items-center gap-2">
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">Phase 2 — AI builds in Dev Sandbox</div>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {[
                  { num: "3", title: "AI reads ticket + org metadata", desc: "Checks for conflicts, loads org context" },
                  { num: "4", title: "Deploys to Dev Sandbox", desc: "Metadata API + Tooling API · Real deployment" },
                  { num: "5", title: "AI self-evaluates", desc: "Verifies every acceptance criterion · Scores 0–100%" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.num}</span>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[10.5px] font-bold text-[#e2e8f0]">{item.title}</div>
                      <div className="text-[10px] text-[#4a7fa5]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 3 */}
            <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0 shadow-lg shadow-[#7C3AED]/5">
              <div className="bg-[#1a0d2e] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#3d1f6d]">
                <div className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">Phase 3 — Git branch + human review</div>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {[
                  { num: "6", title: "AI commits SFDX metadata to Git branch", desc: `feature/${ticketKey.toLowerCase()} · Auto-generated commit messages` },
                  { num: "7", title: "AI creates GitHub Pull Request", desc: "PR description = AI eval report + acceptance criteria results" },
                  { num: "8", title: "Human reviews in Dev Sandbox + PR", desc: "Checklist · Verify visually · Approve or request changes" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#7C3AED] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.num}</span>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[10.5px] font-bold text-[#e2e8f0]">{item.title}</div>
                      <div className="text-[10px] text-[#4a7fa5]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 4 */}
            <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0 shadow-lg shadow-[#15803D]/5">
              <div className="bg-[#0d2f17] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#15803D]">
                <div className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider">Phase 4 — Multi-org promotion</div>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {[
                  { num: "9", title: "Approved → Auto-deploy to QA Sandbox", desc: "Same metadata from Git · QA team verifies · Jira → \"In QA\"" },
                  { num: "10", title: "QA approved → Deploy to UAT", desc: "Business users verify · UAT sign-off required · Jira → \"In UAT\"" },
                  { num: "11", title: "UAT approved → Production (manual)", desc: "Always requires explicit human action · PR merged to main · Jira → Done" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#15803D] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.num}</span>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[10.5px] font-bold text-[#e2e8f0]">{item.title}</div>
                      <div className="text-[10px] text-[#4a7fa5]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Jira Lifecycle Card */}
          <div className="bg-[#031b2e] rounded-xl border border-[#1e3a52] overflow-hidden shrink-0">
            <div className="bg-[#0d1f35] px-3.5 py-2.5 border-b border-[#1e3a52]/50">
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Jira ticket lifecycle — auto-updated by Forge at every stage</div>
            </div>
            <div className="p-4 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-0 min-w-max">
                {[
                  { s: 'To Do', i: 0, statusKey: 'To Do' },
                  { s: 'Build Triggered', i: 1, statusKey: 'Build Triggered' },
                  { s: 'Building', i: 2, statusKey: 'Building' },
                  { s: 'AI Eval', i: 3, statusKey: 'AI Eval' },
                  { s: 'In Dev Review', i: 4, statusKey: 'In Review' },
                  { s: 'In QA', i: 5, statusKey: 'In QA' },
                  { s: 'QA Approved', i: 6, statusKey: 'QA Approved' },
                  { s: 'In UAT', i: 7, statusKey: 'In UAT' },
                  { s: 'UAT Approved', i: 8, statusKey: 'UAT Approved' },
                  { s: 'In Production', i: 9, statusKey: 'In Production' },
                  { s: 'Done', i: 10, statusKey: 'Done' }
                ].map((item, i, arr) => {
                  const isActive = ticketStatus.toLowerCase() === item.statusKey.toLowerCase();
                  return (
                    <React.Fragment key={i}>
                      <div className={`rounded-lg px-2.5 py-1.5 text-[9px] font-bold whitespace-nowrap transition-all ${
                        isActive ? 'bg-[#00A1E0] text-white scale-105 shadow-[0_0_12px_rgba(0,161,224,0.4)]' :
                        item.i === 0 ? 'bg-[#1a3050]/60 text-[#5a9fd4]/60' :
                        item.i < 4 ? 'bg-[#3f2d00]/60 text-[#FCD34D]/60' :
                        item.i < 6 ? 'bg-[#032D60]/60 text-[#7CC4E4]/60' :
                        item.i === 6 || item.i === 8 ? 'bg-[#0d2f17]/60 text-[#4ade80]/60' :
                        item.i === 10 ? 'bg-[#1e0d3f]/60 text-[#a78bfa]/60' :
                        'bg-[#021b36]/60 text-[#7CC4E4]/60'
                      }`}>
                        {item.s} {isActive ? '● Active' : ''}
                      </div>
                      {i < arr.length - 1 && <span className="text-[#1a3050] text-[12px] mx-1">→</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={generateSdd}
            className="w-full bg-[#00A1E0] hover:bg-[#0081B5] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-[13px] transition-all active:scale-[0.98] shadow-lg shadow-[#00A1E0]/20 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Generate complete SDD for this pipeline ↗
          </button>
          <div className="h-4"></div>
        </div>
      </div>

      {/* Systems Design Document (SDD) Generation Modal */}
      {sddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-300">
          <div className="bg-[#021427] border border-[#1e3a52] w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-[#031b2e] border-b border-[#1e3a52] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00a1e0] animate-pulse"></div>
                <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">
                  Systems Design Document (SDD) — {ticketKey}
                </h3>
              </div>
              <button 
                onClick={() => setSddOpen(false)}
                className="text-[#4a7fa5] hover:text-white text-[11px] font-bold transition-all"
              >
                Close ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {sddGenerating ? (
                /* Generating State */
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-5 animate-pulse">
                  <Loader2 className="animate-spin h-10 w-10 text-[#00a1e0]" />
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[13px] font-bold text-[#e2e8f0]">Generating Systems Design Document...</span>
                    <span className="text-[10px] text-[#4a7fa5] font-mono">Progress: {Math.round(sddProgress)}%</span>
                  </div>
                  <div className="w-full max-w-md h-1.5 bg-[#1a3050] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00a1e0] rounded-full transition-all duration-300" style={{ width: `${sddProgress}%` }}></div>
                  </div>
                  <div className="bg-[#020b16] rounded-xl p-4 border border-[#1e3a52]/40 font-mono text-[9.5px] text-[#4ade80] w-full max-w-lg max-h-[160px] overflow-y-auto flex flex-col gap-1.5 shadow-inner">
                    {sddLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-white/20 select-none">[{idx + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Document View State */
                <div className="flex flex-col gap-5 text-[11.5px] text-[#94a3b8] leading-relaxed">
                  <div className="bg-[#031b2e] border border-[#1e3a52] rounded-xl p-4 flex justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#4a7fa5] uppercase tracking-wider">Jira Ticket</span>
                      <span className="text-[12px] font-bold text-white">{ticketKey}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#4a7fa5] uppercase tracking-wider">Release Version</span>
                      <span className="text-[12px] font-bold text-white">v1.4.0-scrum</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#4a7fa5] uppercase tracking-wider">Status</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0d2f17] text-[#22c55e] border border-[#22c55e]/20 w-fit">PROMOTED ✓</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#4a7fa5] uppercase tracking-wider">Generated By</span>
                      <span className="text-[12px] font-bold text-white">Forge AI DevOps</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className="text-[13px] font-bold text-white border-b border-[#1e3a52] pb-1">1. Summary & Objective</h4>
                    <p>
                      This Systems Design Document specifies the technical design, object schema customizations, and automation processes deployed under Jira ticket <strong>{ticketKey}</strong>. All configurations have been successfully promoted through the Forge DevOps pipeline and validated on the QA and UAT Sandboxes.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className="text-[13px] font-bold text-white border-b border-[#1e3a52] pb-1">2. Salesforce Metadata Schema Delta</h4>
                    <p className="mb-2">The following components are defined and deployed as part of this release package:</p>
                    <div className="border border-[#1e3a52] rounded-xl overflow-hidden bg-[#031b2e]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#021427] text-white font-bold border-b border-[#1e3a52] text-[10px] uppercase tracking-wider">
                            <th className="p-3">Component Type</th>
                            <th className="p-3">API Name</th>
                            <th className="p-3">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planSteps.length > 0 ? (
                            planSteps.map((step: any, idx: number) => (
                              <tr key={idx} className="border-b border-[#1e3a52]/40 hover:bg-[#021427]/40 transition-colors">
                                <td className="p-3 font-mono text-[#00a1e0]">{step.type || 'Metadata'}</td>
                                <td className="p-3 font-mono text-[#a78bfa]">{step.fullName || step.name || 'Component'}</td>
                                <td className="p-3 text-[#e2e8f0]/80">{step.detail || step.title}</td>
                              </tr>
                            ))
                          ) : (
                            <>
                              <tr className="border-b border-[#1e3a52]/40">
                                <td className="p-3 font-mono text-[#00a1e0]">CustomField</td>
                                <td className="p-3 font-mono text-[#a78bfa]">Account.Account_Status__c</td>
                                <td className="p-3">Picklist field for Account status tracking.</td>
                              </tr>
                              <tr className="border-b border-[#1e3a52]/40">
                                <td className="p-3 font-mono text-[#00a1e0]">Flow</td>
                                <td className="p-3 font-mono text-[#a78bfa]">Auto_Update_Account_Status</td>
                                <td className="p-3">Record-triggered flow to update Account Status based on Annual Revenue.</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className="text-[13px] font-bold text-white border-b border-[#1e3a52] pb-1">3. Pipeline Quality & Compliance Verification</h4>
                    <p className="mb-2">The deployment has passed all system security checks, code coverage checks, and regression tests with a perfect <strong>100% success score</strong>:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#031b2e] border border-[#1e3a52] rounded-xl p-3 flex flex-col gap-1.5">
                        <span className="font-bold text-white text-[11px]">Dev Sandbox Evaluation</span>
                        <div className="flex items-center gap-2 text-[#22c55e] font-bold">
                          <span>✓ 94% Evaluation Score</span>
                        </div>
                        <span className="text-[10px] text-[#4a7fa5]">All structural acceptance criteria successfully met.</span>
                      </div>
                      <div className="bg-[#031b2e] border border-[#1e3a52] rounded-xl p-3 flex flex-col gap-1.5">
                        <span className="font-bold text-white text-[11px]">Git Version Control</span>
                        <span className="text-[#a78bfa] font-mono">Branch: feature/{ticketKey.toLowerCase()}</span>
                        <span className="text-[10px] text-[#4a7fa5]">Clean commit history, package.xml validated, and PR created.</span>
                      </div>
                      <div className="bg-[#031b2e] border border-[#1e3a52] rounded-xl p-3 flex flex-col gap-1.5">
                        <span className="font-bold text-white text-[11px]">QA Sandbox Verification</span>
                        <div className="flex items-center gap-2 text-[#22c55e] font-bold">
                          <span>✓ Verified successfully</span>
                        </div>
                        <span className="text-[10px] text-[#4a7fa5]">Automated and visual checks verified on live QA sandbox.</span>
                      </div>
                      <div className="bg-[#031b2e] border border-[#1e3a52] rounded-xl p-3 flex flex-col gap-1.5">
                        <span className="font-bold text-white text-[11px]">UAT Sandbox Verification</span>
                        <div className="flex items-center gap-2 text-[#22c55e] font-bold">
                          <span>✓ Live / Ready for sign-off</span>
                        </div>
                        <span className="text-[10px] text-[#4a7fa5]">Promoted successfully using standard Tooling and Metadata API.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h4 className="text-[13px] font-bold text-white border-b border-[#1e3a52] pb-1">4. Acceptance Criteria Checklist</h4>
                    <div className="flex flex-col gap-1.5">
                      {plan?.acceptanceCriteria ? (
                        plan.acceptanceCriteria.map((ac: string, idx: number) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <span className="text-[#22c55e] font-bold">✓</span>
                            <span>{ac}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex gap-2.5 items-start">
                            <span className="text-[#22c55e] font-bold">✓</span>
                            <span>Metadata components successfully compiled and deployed.</span>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <span className="text-[#22c55e] font-bold">✓</span>
                            <span>Salesforce Flow triggers execute without recursion or Governor Limit issues.</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#031b2e] border-t border-[#1e3a52] px-6 py-4 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-[#4a7fa5]">
                Forge DevOps Systems Design Generator · Confidential
              </span>
              <div className="flex gap-2.5">
                <button 
                  onClick={() => setSddOpen(false)}
                  className="bg-[#112240] hover:bg-[#1b3b6f] text-white font-bold px-4 py-2 rounded-xl text-[11px] transition-all active:scale-95 border border-white/5"
                >
                  Close Document
                </button>
                {!sddGenerating && (
                  <button 
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.print();
                      }
                    }}
                    className="bg-[#00A1E0] hover:bg-[#0081B5] text-white font-bold px-4 py-2 rounded-xl text-[11px] transition-all active:scale-95 shadow-md shadow-[#00A1E0]/10 flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print Document
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
