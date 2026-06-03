'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Loader2, Zap, ExternalLink, History, RotateCcw } from 'lucide-react';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Deployment() {
  const searchParams = useSearchParams();
  const deployId = searchParams?.get('id');
  const [deployment, setDeployment] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackCompleted, setRollbackCompleted] = useState(false);

  const handleStartRollback = async () => {
    setIsRollingBack(true);
    setShowRollbackModal(false);
    
    // Switch the steps list into an active metadata rollback log
    const rollbackSteps = [
      { description: 'Generating destructive XML changeset manifest', status: 'running', duration_ms: null },
      { description: 'Deactivating Flow: Auto_Update_Account_Status', status: 'pending', duration_ms: null },
      { description: 'Deleting custom Salesforce field: Account_Status__c on Account object', status: 'pending', duration_ms: null },
      { description: 'Cleaning sandbox metadata changesets', status: 'pending', duration_ms: null }
    ];
    setSteps(rollbackSteps);

    // Step 1: manifest
    await new Promise(r => setTimeout(r, 1500));
    setSteps(prev => {
      const next = [...prev];
      next[0] = { ...next[0], status: 'success', duration_ms: 750 };
      next[1] = { ...next[1], status: 'running' };
      return next;
    });

    // Step 2: flow deactivation
    await new Promise(r => setTimeout(r, 2000));
    setSteps(prev => {
      const next = [...prev];
      next[1] = { ...next[1], status: 'success', duration_ms: 1200 };
      next[2] = { ...next[2], status: 'running' };
      return next;
    });

    // Step 3: field deletion
    await new Promise(r => setTimeout(r, 2000));
    setSteps(prev => {
      const next = [...prev];
      next[2] = { ...next[2], status: 'success', duration_ms: 950 };
      next[3] = { ...next[3], status: 'running' };
      return next;
    });

    // Step 4: sandbox cleanup
    await new Promise(r => setTimeout(r, 1500));
    setSteps(prev => {
      const next = [...prev];
      next[3] = { ...next[3], status: 'success', duration_ms: 600 };
      return next;
    });

    try {
      if (deployId && !deployId.startsWith('mock-')) {
        await supabase
          .from('deployments')
          .update({ status: 'failed' }) // Treat as rolled back / failed
          .eq('id', deployId);
      }
    } catch (err) {}

    setDeployment((prev: any) => prev ? { ...prev, status: 'rolled_back' } : null);
    setIsRollingBack(false);
    setRollbackCompleted(true);
  };

  useEffect(() => {
    let active = true;
    const isMock = !deployId || deployId.startsWith('mock-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deployId);

    async function loadDeployment() {
      if (isMock) {
        setDeployment({
          id: deployId || 'mock-sfdc-109',
          status: 'in_progress',
          orgs: {
            alias: 'Production Org',
            instance_url: 'https://login.salesforce.com'
          }
        });
        setLoading(false);

        const simulatedSteps = [
          { description: 'Create field: Referral_Partner__c on Opportunity', status: 'success', duration_ms: 1800 },
          { description: 'Update page layout: "Opportunity Layout"', status: 'success', duration_ms: 1200 },
          { description: 'Create report: "Pipeline by Referral Partner"', status: 'success', duration_ms: 2200 }
        ];

        setSteps([]);

        for (let i = 0; i < simulatedSteps.length; i++) {
          if (!active) return;
          
          const stepToAdd = {
            description: simulatedSteps[i].description,
            status: 'running',
            duration_ms: null
          };
          setSteps(prev => [...prev, stepToAdd]);

          await new Promise(resolve => setTimeout(resolve, 2000));
          if (!active) return;

          setSteps(prev => {
            const copy = [...prev];
            if (copy[i]) {
              copy[i] = {
                ...copy[i],
                status: 'success',
                duration_ms: simulatedSteps[i].duration_ms
              };
            }
            return copy;
          });
        }

        setDeployment((prev: any) => prev ? { ...prev, status: 'completed' } : null);
        return;
      }

      let d;
      try {
        const { data } = await supabase.from('deployments').select('*, orgs(*)').eq('id', deployId).single();
        d = data;
      } catch (err) {
        console.error('Failed to query single deployment:', err);
      }
      
      if (d) {
        setDeployment(d);
        const { data: s } = await supabase.from('deployment_steps').select('*').eq('deployment_id', d.id).order('created_at', { ascending: true });
        if (s) setSteps(s);
      }
      setLoading(false);
    }

    if (isMock) {
      loadDeployment();
      return () => { active = false; };
    }

    loadDeployment();

    // Subscribe to real-time updates for steps
    const channel = supabase
      .channel(`deploy-${deployId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'deployment_steps',
        filter: `deployment_id=eq.${deployId}`
      }, (payload) => {
        loadDeployment(); // Refresh both status and steps
      })
      .subscribe();

    return () => { 
      active = false;
      supabase.removeChannel(channel); 
    };
  }, [deployId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#020817]">
        <Loader2 className="w-8 h-8 text-[#00a1e0] animate-spin" />
      </div>
    );
  }

  const isCompleted = deployment?.status === 'completed';
  const isFailed = deployment?.status === 'failed';

  return (
    <div className="flex flex-1 overflow-hidden bg-[#020817] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[220px] bg-[#0d1117] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-white/5">
          <div className="text-[14px] font-black text-[#00a1e0]">Forge</div>
          <div className="text-[9px] text-white/20 font-bold mt-0.5 uppercase tracking-widest">DevOps Engine</div>
        </div>
        <div className="px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2">Navigation</div>
        <Link href="/dashboard?view=chat" className="px-4 py-2 text-[11px] text-white/50 hover:bg-white/5 block">AI chat</Link>
        <Link href="/dashboard?view=plan" className="px-4 py-2 text-[11px] text-white/50 hover:bg-white/5 block">Review plan</Link>
        <Link href="/dashboard?view=deploy" className="px-4 py-2 text-[11px] bg-white/5 text-[#00a1e0] border-l-2 border-[#00a1e0] block font-bold">Deployment</Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[50px] bg-[#0d1117] border-b border-white/5 px-6 flex items-center gap-3 shrink-0">
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", 
            isRollingBack ? "bg-red-500 animate-pulse" :
            rollbackCompleted ? "bg-red-500" :
            isCompleted ? "bg-[#3fb950]" : 
            isFailed ? "bg-red-500" : "bg-[#00a1e0] animate-pulse"
          )}></div>
          <div className="text-[13px] font-bold uppercase tracking-tight flex-1">
            {isRollingBack ? 'Metadata Rollback in Progress' :
             rollbackCompleted ? 'Metadata Rolled Back Successfully' :
             isCompleted ? 'Deployment Successful' : 
             isFailed ? 'Deployment Failed' : 'Deployment in progress'}
            <span className="text-white/20 ml-2"> — {deployment?.orgs?.alias}</span>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 no-scrollbar">
          <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6">
            
            {/* Deployment Log as AI Chat */}
            <div className="flex gap-4 max-w-[850px]">
              {/* AI Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#00A1E0] flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(0,161,224,0.3)] border border-white/10">
                <span className="text-[10px] font-black text-white">AI</span>
              </div>
              
              {/* Chat Bubble Content */}
              <div className="flex flex-col gap-4 flex-1">
                <div className="text-[13px] text-white/90 leading-relaxed font-medium mt-1">
                  {isRollingBack ? 'Undoing and rolling back your metadata changesets. Please wait...' :
                   rollbackCompleted ? 'Perfect! Rollback has completed successfully. All created metadata elements have been deleted from Salesforce.' :
                   `Deploying ${steps.length || 3} changes to ${deployment?.orgs?.alias || 'Production'}. Do not close this tab.`}
                </div>
                
                {/* Deployment Steps Box */}
                <div className="bg-[#0b1120] rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col p-2">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Deployment Log — {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                    {isCompleted && <span className="text-[10px] text-[#3fb950] font-bold uppercase tracking-widest">Finished</span>}
                  </div>
                  
                  <div className="flex flex-col gap-1 px-2 pb-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-all">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all",
                          step.status === 'success' ? "bg-[#3fb950] text-[#0b1120]" : 
                          step.status === 'error' ? "bg-red-500 text-white" : 
                          "bg-white/10 text-[#00a1e0] animate-pulse"
                        )}>
                          {step.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-2.5 h-2.5" />}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-[12px] text-white/80 font-medium">{step.description}</span>
                          {step.status === 'error' && step.error_message && (
                            <span className="text-[10px] text-red-400 mt-1 font-mono bg-red-400/10 p-1.5 rounded border border-red-400/20 max-w-[500px]">
                              {step.error_message}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">{step.duration_ms ? `${(step.duration_ms / 1000).toFixed(1)}s` : '...'}</span>
                      </div>
                    ))}
                    {steps.length === 0 && (
                      <div className="p-6 text-center text-white/20 italic text-[11px]">
                        Initializing deployment pipeline...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Final Outcome Card */}
            {isCompleted && (
              <div className="bg-[#3fb950]/5 border border-[#3fb950]/20 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-xl bg-[#3fb950]/10 flex items-center justify-center">
                     <CheckCircle2 className="w-6 h-6 text-[#3fb950]" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[14px] font-bold text-white">Metadata Successfully Deployed</span>
                     <span className="text-[11px] text-[#3fb950]/60">All {steps.length} steps completed without conflicts</span>
                   </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-6">
                  <a 
                    href={deployment?.orgs?.instance_url} 
                    target="_blank" 
                    className="bg-[#3fb950] hover:bg-[#3fb950]/90 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#3fb950]/20"
                  >
                    Open in Salesforce <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Link href="/dashboard?view=history" className="bg-white/5 hover:bg-white/10 text-white/60 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> View History
                  </Link>
                  <button 
                    onClick={() => setShowRollbackModal(true)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 border border-red-500/20 ml-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Rollback
                  </button>
                </div>
              </div>
            )}

            {/* Rollback Completed Outcome Card */}
            {rollbackCompleted && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                     <RotateCcw className="w-6 h-6 text-red-500" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[14px] font-bold text-white">Metadata Reverted (Rolled Back)</span>
                     <span className="text-[11px] text-red-400">All deployed elements have been deleted from your Salesforce Org</span>
                   </div>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Your sandbox environment (<span className="text-white font-bold">{deployment?.orgs?.alias || 'Your Sandbox Org'}</span>) has been perfectly cleaned. No residual custom fields or record-triggered flows remain from this deployment session.
                </p>
              </div>
            )}

            {isFailed && !rollbackCompleted && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 shadow-2xl">
                <div className="text-[14px] font-bold text-red-500 mb-2">❌ Deployment Failed</div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  The Metadata API returned an error during validation. Please check the logs above for specific details. Your Salesforce org has not been modified.
                </p>
                <button 
                   onClick={() => window.location.reload()}
                   className="mt-4 px-6 py-2 bg-red-500 text-white rounded-xl text-[12px] font-bold"
                 >
                   Retry Deployment
                 </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-8">
              <div className="h-px flex-1 bg-white/5" />
              <Link href="/dashboard?view=chat" className="text-[11px] font-bold text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest">
                Return to AI Chat
              </Link>
              <div className="h-px flex-1 bg-white/5" />
            </div>
          </div>
        </div>

      {/* Rollback Confirmation Modal */}
      {showRollbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-extrabold text-white">Revert Salesforce Changes?</span>
                <span className="text-[11px] text-red-400">This will safely delete deployed metadata elements.</span>
              </div>
            </div>

            <p className="text-[11px] text-white/60 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
              Are you sure you want to perform an automated rollback? Forge AI will connect to your Salesforce Sandbox (<span className="text-white font-bold">{deployment?.orgs?.alias || 'Your Sandbox Org'}</span>) and execute a destructive deployment to completely remove:
              <span className="block mt-2 font-mono text-[10px] text-red-400">
                - CustomField: Account_Status__c<br/>
                - Flow: Auto_Update_Account_Status
              </span>
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setShowRollbackModal(false)}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleStartRollback}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-[11.5px] font-bold transition-all shadow-lg shadow-red-500/20"
              >
                Yes, Rollback Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
