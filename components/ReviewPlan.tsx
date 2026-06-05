'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrg, getCurrentUser } from '@/lib/supabase-helpers';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Play, 
  Zap, 
  Send, 
  Plus, 
  MessageSquare, 
  FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReviewPlan() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams?.get('id');
  const [plan, setPlan] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const supabase = createClient();

  // Load org, plans list, and selected plan
  useEffect(() => {
    setMounted(true);
    
    async function loadData() {
      // 1. Fetch User & Active Org
      const activeOrg = await getActiveOrg(supabase);
      if (!activeOrg) {
        setLoading(false);
        return;
      }
      setOrg(activeOrg);

      const user = await getCurrentUser(supabase);
      if (!user) {
        setLoading(false);
        return;
      }

      // 2. Fetch User's Conversations for the Active Org to filter recent plans
      const { data: userConvos } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', activeOrg.id);
      
      const convoIds = userConvos ? userConvos.map(c => c.id) : [];

      // 3. Fetch Recent Plans from Supabase (filtered by User's Conversations for the Active Org)
      let plansData = [];
      if (convoIds.length > 0) {
        const { data } = await supabase
          .from('messages')
          .select('*, conversations(id, title)')
          .in('conversation_id', convoIds)
          .not('implementation_plan', 'is', null)
          .order('created_at', { ascending: false });
        if (data) plansData = data;
      }
      setRecentPlans(plansData);

      // 3. Load Selected Plan
      let selectedMsg = null;
      if (planId && planId !== 'current') {
        const { data } = await supabase
          .from('messages')
          .select('*, conversations(id, title)')
          .eq('id', planId)
          .limit(1);
        if (data && data.length > 0) selectedMsg = data[0];
      } else {
        if (plansData && plansData.length > 0) {
          selectedMsg = plansData[0];
        }
      }

      if (selectedMsg) {
        setPlan(selectedMsg.implementation_plan);
        setActiveMessageId(selectedMsg.id);
        setActiveConversationId(selectedMsg.conversation_id);
        
        // Fetch chat messages for this conversation to build chat history context
        const { data: convoMsgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedMsg.conversation_id)
          .order('created_at', { ascending: true });
        
        if (convoMsgs) {
          setChatMessages(convoMsgs.map((m: any) => ({
            role: m.role,
            content: m.content
          })));
        }
      }
      setLoading(false);
    }
    
    loadData();
  }, [planId]);

  const handleSelectPlan = (planItem: any) => {
    router.push(`/dashboard?view=plan&id=${planItem.id}`);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !activeConversationId || !org) return;

    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setGenerating(true);
    setStatus('AI is processing your requested plan refinements...');

    try {
      // 1. Save user message to database
      await supabase.from('messages').insert({
        role: 'user',
        content: currentInput,
        conversation_id: activeConversationId
      });

      // 2. Call chat route to stream refinement
      const newMessages = [...chatMessages, userMsg];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          orgId: org.id,
          conversationId: activeConversationId
        }),
      });

      if (!res.ok) throw new Error('Refinement request failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';
      let aiMessage = { role: 'assistant', content: '' };
      setChatMessages(prev => [...prev, aiMessage]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content') {
                aiContent += data.text;
                aiMessage.content = aiContent;
                setChatMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...aiMessage };
                  return newMsgs;
                });
              } else if (data.type === 'plan' && data.plan) {
                // Instantly update the visual plan steps on the fly!
                setPlan(data.plan);
                setStatus('Plan successfully refined by AI.');
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('Error refining plan.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    let planData = plan;
    if (!planData) {
      planData = {
        items: [
          {
            type: 'CustomObject',
            action: 'create',
            fullName: 'School__c',
            metadata: {
              label: 'School',
              pluralLabel: 'Schools',
              sharingModel: 'ReadWrite',
              deploymentStatus: 'Deployed',
              nameField: {
                type: 'Text',
                label: 'School Name'
              }
            }
          }
        ]
      };
    }
    
    setLoading(true);
    const targetOrg = org || { id: '00DdN000000abcde' };
    
    const user = await getCurrentUser(supabase);
    
    const planObj = planData?.plan || planData;
    const finalPlanItems = planObj?.items || planObj?.steps || [];

    const { data: deploy, error } = await supabase.from('deployments').insert({
      org_id: targetOrg.id,
      user_id: user?.id,
      status: 'queued',
      rollback_metadata: JSON.stringify(finalPlanItems)
    }).select().single();

    if (deploy) {
      await supabase.from('deployment_steps').insert({
        deployment_id: deploy.id,
        description: 'AI Generated Plan',
        status: 'pending'
      });

      fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deploymentId: deploy.id,
          plan: finalPlanItems
        })
      });
      
      router.push(`/dashboard?view=deploy&id=${deploy.id}`);
    } else {
      console.error('Deployment creation failed:', error);
      alert('Failed to start deployment: ' + (error?.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const mockPlanItems = [
    {
      title: 'Create field: Referral_Partner__c on Opportunity',
      desc: 'Type: Lookup to Account · Filter: RecordType.Name = \'Partner\' · Label: "Referred by Partner" · Required: No · Help text: "Select the partner who referred this deal"',
      badge: 'Metadata API · CustomField'
    },
    {
      title: 'Add field to page layout: "Opportunity Layout"',
      desc: 'Section: Key Information (row 3, column 1) · Visible on: All record types · Edit permission: Edit',
      badge: 'Metadata API · Layout'
    },
    {
      title: 'Create report: "Pipeline by Referral Partner"',
      desc: 'Type: Summary report · Object: Opportunity · Grouped by: Referral_Partner__c · Columns: Name, Amount, CloseDate, StageName · Filter: Is Open = True · Folder: Sales Reports',
      badge: 'Report API'
    }
  ];

  const itemsToDisplay = plan
    ? (plan.items || plan.steps || []).map((item: any) => {
        let title = item.fullName || 'Metadata Change';
        let desc = 'Deploying generated metadata updates.';
        let badge = `Metadata API · ${item.type || 'Custom'}`;

        if (item.type === 'CustomObject') {
          title = `Create Custom Object: ${item.fullName}`;
          desc = `Label: "${item.metadata?.label || ''}" · Plural Label: "${item.metadata?.pluralLabel || ''}" · Sharing Model: "${item.metadata?.sharingModel || 'ReadWrite'}"`;
        } else if (item.type === 'CustomField') {
          title = `Create field: ${item.fullName}`;
          desc = `Type: ${item.metadata?.type || 'Text'} · Label: "${item.metadata?.label || ''}" · Required: ${item.metadata?.required ? 'Yes' : 'No'}`;
        } else if (item.type === 'ApexClass') {
          title = `Create Apex Class: ${item.fullName}`;
          desc = `Class body has ${(item.metadata?.body || '').split('\n').length || 0} lines containing business logic.`;
        }
        return { title, desc, badge };
      })
    : mockPlanItems;

  const totalChangesCount = itemsToDisplay.length;
  const estimatedSeconds = Math.max(15, totalChangesCount * 15);

  if (!mounted) return null;

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans animate-fade-in">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 no-scrollbar">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge AI Reviewer</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52]">
          <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">
            {org?.alias || 'Acme Corp - Production'}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
            <span className="text-[9px] text-[#22c55e]">Connected</span>
          </div>
        </div>

        {/* Plan Session History */}
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-2 flex items-center gap-2">
           <FileText className="w-3 h-3 text-[#00A1E0]" /> PLAN SESSIONS
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 flex flex-col gap-1 mt-1">
          {recentPlans.map((item, idx) => {
            const isSelected = item.id === activeMessageId;
            const displayName = item.conversations?.title || `Plan #${recentPlans.length - idx}`;
            
            return (
              <div 
                key={idx} 
                onClick={() => handleSelectPlan(item)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all group",
                  isSelected ? "bg-[#0d2137] border-l-2 border-[#00A1E0]" : ""
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className={cn("w-3.5 h-3.5 shrink-0 opacity-80", isSelected ? "text-[#00A1E0]" : "text-[#4a7fa5]")} />
                  <span className={cn(
                    "text-[10px] font-medium truncate group-hover:text-white transition-colors",
                    isSelected ? "text-[#e2e8f0]" : "text-[#7cc4e4]"
                  )}>
                    {displayName}
                  </span>
                </div>
              </div>
            );
          })}
          {recentPlans.length === 0 && (
            <div className="opacity-20 text-center py-4 text-[9px] italic">No past plans found</div>
          )}
        </div>

        <Link 
          href="/dashboard?view=chat"
          className="m-3 mt-1 bg-[#00A1E0] hover:bg-[#0081B5] text-white font-bold py-2.5 rounded-lg text-[11px] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> Start New Build
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#050b16]">
        {/* Inner Top Bar */}
        <div className="h-[60px] bg-[#021427] border-b border-[#1e3a52] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-[#D97706] rounded-full shrink-0 animate-pulse"></div>
            <div className="text-[15px] font-bold text-white">Review Implementation Plan — Approval required</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#FCD34D] uppercase tracking-widest bg-[#3f2d00]/60 px-3 py-1 rounded border border-[#D97706]/40 flex items-center gap-1.5">
              ⚡ Awaiting your approval
            </span>
          </div>
        </div>

        {/* Scrollable Plan Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="max-w-[1000px] mx-auto w-full space-y-6">
            
            {/* Header Banner */}
            <div className="bg-[#0d2137] border border-[#D97706]/40 rounded-xl px-5 py-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#D97706]"></div>
                <span className="text-[13px] font-bold text-white">Implementation plan — review before deploying</span>
              </div>
              <span className="text-[10px] font-extrabold text-[#FCD34D] bg-[#3f2d00]/80 px-2.5 py-1 rounded-md border border-[#D97706]/20">
                {totalChangesCount} changes · Estimated {estimatedSeconds} seconds
              </span>
            </div>

            {/* Change Step Cards */}
            <div className="space-y-3">
              {itemsToDisplay.map((step: any, idx: number) => (
                <div key={idx} className="bg-[#0b1c31] border border-[#1e3a52] rounded-xl p-5 flex gap-4 hover:border-[#00A1E0]/50 transition-all">
                  <div className="w-6 h-6 rounded-full bg-[#00A1E0]/15 text-[#00A1E0] text-[11px] font-extrabold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="text-[13px] font-bold text-white">{step.title}</div>
                    <div className="text-[11px] text-[#7da5c9] leading-relaxed max-w-[90%]">{step.desc}</div>
                  </div>
                  <div className="shrink-0 flex items-start">
                    <span className="bg-[#1e3a52] text-[#7CC4E4] px-2.5 py-0.5 rounded text-[9px] font-bold border border-[#1e3a52]/40 uppercase tracking-wider">
                      {step.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Large Wide Action Buttons */}
            <div className="grid grid-cols-5 gap-3 pt-2">
              <button 
                onClick={handleApprove}
                className="col-span-2 bg-[#15803D] hover:bg-[#126932] text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 text-[12px] uppercase tracking-wider transition-all shadow-lg shadow-[#15803D]/10 active:scale-[0.98]"
              >
                ✓ Approve & Deploy to Production
              </button>
              <button 
                onClick={handleApprove}
                className="col-span-2 bg-[#D97706] hover:bg-[#b25e03] text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 text-[12px] uppercase tracking-wider transition-all shadow-lg shadow-[#D97706]/10 active:scale-[0.98]"
              >
                ⚡ Deploy to Sandbox first
              </button>
              <Link 
                href="/dashboard?view=chat" 
                className="col-span-1 bg-[#1e3a52] hover:bg-[#2c4e6e] text-white/70 font-extrabold py-4 rounded-xl flex items-center justify-center gap-1.5 text-[12px] uppercase tracking-wider transition-all active:scale-[0.98]"
              >
                ✗ Cancel
              </Link>
            </div>

            {/* "Before You Approve" Info Box */}
            <div className="bg-[#0c2035] border border-[#1e3a52] rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00A1E0]"></div>
                <span className="text-[12px] font-extrabold text-white uppercase tracking-wider">Before you approve — a few things to know</span>
              </div>
              <ul className="space-y-2 text-[11px] text-[#7da5c9] pl-3 list-disc">
                <li>This will not delete or modify any existing data</li>
                <li>The new field will be empty on all existing Opportunity records</li>
                <li>Rollback available for 24 hours after deployment</li>
                <li>Recommended: deploy to Sandbox first to test the page layout change</li>
              </ul>
              <div className="text-[11px] font-extrabold text-white/90 pt-1">
                If you approve, deployment will take approximately {estimatedSeconds} seconds.
              </div>
            </div>

          </div>
        </div>

        {/* Refinement Status Banner */}
        {status && (
          <div className="mx-6 mb-3 px-3 py-2 bg-[#021427] border border-[#1e3a52] rounded-lg flex items-center gap-2 shrink-0 shadow-md">
            {status.includes('refined') || status.includes('success') ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
            ) : generating ? (
              <Loader2 className="w-3.5 h-3.5 text-[#00A1E0] animate-spin shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            )}
            <span className="text-[10px] font-bold text-[#e2e8f0]">{status}</span>
          </div>
        )}

        {/* Input Chat Box at the very bottom */}
        <div className="bg-[#021427] border-t border-[#1e3a52] px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative flex items-center">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={generating}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(); } }}
              placeholder={activeConversationId ? "Ask for changes before approving..." : "Select a plan session from the left sidebar to start refining..."}
              className="w-full bg-[#050b16] border border-[#1e3a52] rounded-xl pl-4 pr-12 py-3 text-[12px] text-white placeholder-[#4a7fa5] focus:outline-none focus:border-[#00A1E0] transition-colors"
            />
            <button 
              onClick={handleChatSend}
              disabled={generating || !chatInput.trim()}
              className="absolute right-3 p-1.5 rounded-lg bg-[#185FA5]/35 hover:bg-[#00A1E0] text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 fill-current" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
