'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Zap,
  Play,
  Plus,
  Terminal,
  FileCode,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Camera,
  FolderPlus,
  Compass,
  Boxes,
  Globe,
  Palette,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ApexSession {
  id: string;
  title: string;
  selectedClass: any;
  originalCode: string;
  refactoredCode: string;
  messages: any[];
  status: string | null;
  timestamp: string;
}

export function ApexBuilder() {
  const router = useRouter();
  const supabase = createClient();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [originalCode, setOriginalCode] = useState('');
  const [refactoredCode, setRefactoredCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const [sessions, setSessions] = useState<ApexSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close plus menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load sessions and classes on mount
  useEffect(() => {
    async function init() {
      // Fetch org
      try {
        const orgRes = await fetch('/api/orgs');
        const orgs = await orgRes.json();
        if (orgs && orgs.length > 0) setOrg(orgs[0]);
      } catch (e) {
        console.error(e);
      }

      // Fetch org classes
      try {
        const res = await fetch('/api/apex/list');
        const data = await res.json();
        setClasses(data.classes || []);
      } catch (e) {
        console.error(e);
      }

      // Load sessions
      const saved = localStorage.getItem('forge_apex_sessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
          if (parsed.length > 0) {
            const latest = parsed[0];
            setCurrentSessionId(latest.id);
            setSelectedClass(latest.selectedClass);
            setOriginalCode(latest.originalCode);
            setRefactoredCode(latest.refactoredCode);
            setMessages(latest.messages);
            setStatus(latest.status);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    init();
  }, []);

  const saveSessions = (updated: ApexSession[]) => {
    setSessions(updated);
    localStorage.setItem('forge_apex_sessions', JSON.stringify(updated));
  };

  const handleSelectClass = async (cls: any) => {
    setSelectedClass(cls);
    setLoading(true);
    
    const sessionId = Math.random().toString(36).substring(2, 11);
    const title = `Refactor: ${cls.Name}`;
    const initialMsg = { role: 'ai', content: `I've loaded **${cls.Name}.cls**. What would you like me to do with it? I can help with bulkification, optimization, or adding new logic.` };
    
    try {
      const res = await fetch(`/api/apex/read?orgId=${org.id}&classId=${cls.Id}`);
      const data = await res.json();
      const bodyCode = data.body || '';
      
      const newSession: ApexSession = {
        id: sessionId,
        title,
        selectedClass: cls,
        originalCode: bodyCode,
        refactoredCode: '',
        messages: [initialMsg],
        status: 'Class loaded.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const updated = [newSession, ...sessions];
      saveSessions(updated);
      setCurrentSessionId(sessionId);
      setMessages([initialMsg]);
      setOriginalCode(bodyCode);
      setRefactoredCode('');
      setStatus('Class loaded.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (session: ApexSession) => {
    setCurrentSessionId(session.id);
    setSelectedClass(session.selectedClass);
    setOriginalCode(session.originalCode);
    setRefactoredCode(session.refactoredCode);
    setMessages(session.messages);
    setStatus(session.status);
    setPrompt('');
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setSelectedClass(null);
    setOriginalCode('');
    setRefactoredCode('');
    setMessages([]);
    setStatus(null);
    setPrompt('');
  };

  const handleRefactor = async () => {
    if (!prompt.trim()) return;
    
    const userMsg = { role: 'user', content: prompt };
    const currentPrompt = prompt;
    setPrompt('');

    let sessionId = currentSessionId;
    let updatedSessions = [...sessions];
    let activeSession: ApexSession;

    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 11);
      const title = currentPrompt.trim().substring(0, 30) + (currentPrompt.trim().length > 30 ? '...' : '');
      activeSession = {
        id: sessionId,
        title,
        selectedClass: selectedClass,
        originalCode: originalCode,
        refactoredCode: '',
        messages: [userMsg],
        status: 'AI is processing your request...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      updatedSessions = [activeSession, ...updatedSessions];
      setCurrentSessionId(sessionId);
      setMessages([userMsg]);
      setStatus('AI is processing your request...');
    } else {
      activeSession = updatedSessions.find(s => s.id === sessionId)!;
      activeSession.messages = [...activeSession.messages, userMsg];
      activeSession.status = 'AI is processing your request...';
      setMessages(activeSession.messages);
      setStatus('AI is processing your request...');
    }

    saveSessions(updatedSessions);
    setLoading(true);
    
    try {
      const chatMessages = activeSession.messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content
      }));
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: chatMessages,
          orgId: org?.id
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';
      let aiMessage = { role: 'ai', content: '', hasCode: false, plan: null as any, id: null as any };
      
      setMessages(prev => [...prev, aiMessage]);

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
                aiMessage = { ...aiMessage, content: aiContent };
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = aiMessage;
                  return newMsgs;
                });
              } else if (data.type === 'plan') {
                aiMessage = { ...aiMessage, plan: data.plan, id: data.id };
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = aiMessage;
                  return newMsgs;
                });
              }
            } catch (e) {}
          }
        }
      }

      // Stream completed. Extract the generated Apex code block if present.
      const extractApexCode = (markdown: string): string => {
        const match = markdown.match(/```(?:apex|java|plaintext|salesforce)?\n([\s\S]*?)```/i) || markdown.match(/```([\s\S]*?)```/i);
        return match ? match[1].trim() : '';
      };
      
      const extracted = extractApexCode(aiContent);
      
      // Update session in storage
      updatedSessions = JSON.parse(localStorage.getItem('forge_apex_sessions') || '[]');
      const sessionToUpdate = updatedSessions.find(s => s.id === sessionId);
      if (sessionToUpdate) {
        const finalAiMsg = {
          ...aiMessage,
          content: aiContent,
          hasCode: !!extracted,
          original: originalCode || undefined,
          refactored: extracted || undefined
        };
        sessionToUpdate.messages = [...sessionToUpdate.messages.filter(m => m.content !== ''), finalAiMsg];
        sessionToUpdate.status = 'Request complete.';
        if (extracted) {
          sessionToUpdate.refactoredCode = extracted;
        }
        saveSessions(updatedSessions);
        
        if (sessionId === currentSessionId || !currentSessionId) {
          if (extracted) {
            setRefactoredCode(extracted);
          }
          setMessages(sessionToUpdate.messages);
          setStatus('Request complete.');
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('Error processing request.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (codeToDeploy: string) => {
    if (!codeToDeploy) return;
    
    let className = selectedClass?.Name;
    if (!className) {
      const cleanCode = codeToDeploy.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
      const match = cleanCode.match(/\b(?:class|trigger)\s+([a-zA-Z0-9_]+)\b/i);
      className = match ? match[1] : 'TempApexClass';
    }

    setCompiling(true);
    setStatus('Creating deployment pipeline...');
    
    try {
      if (!org) {
        throw new Error('No organization connected.');
      }
      
      const { data: deploy, error: dError } = await supabase.from('deployments').insert({
        org_id: org.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'queued',
        rollback_metadata: JSON.stringify([{ type: 'ApexClass', fullName: className, action: 'create' }])
      }).select().single();

      if (dError || !deploy) {
        throw new Error('Failed to create deployment record: ' + dError?.message);
      }

      const { data: step1 } = await supabase.from('deployment_steps').insert({
        deployment_id: deploy.id,
        description: 'Validating org connection',
        status: 'running'
      }).select().single();

      const { data: step2 } = await supabase.from('deployment_steps').insert({
        deployment_id: deploy.id,
        description: `Deploy ApexClass: ${className}`,
        status: 'pending'
      }).select().single();

      const { data: step3 } = await supabase.from('deployment_steps').insert({
        deployment_id: deploy.id,
        description: 'Post-deployment verification',
        status: 'pending'
      }).select().single();

      await fetch('/api/apex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className,
          body: codeToDeploy,
          orgId: org?.id,
          deploymentId: deploy.id,
          step1Id: step1?.id,
          step2Id: step2?.id,
          step3Id: step3?.id
        })
      });

      router.push(`/dashboard?view=deploy&id=${deploy.id}`);
      
    } catch (err: any) {
      console.error(err);
      setStatus('Error triggering deployment: ' + err.message);
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 no-scrollbar">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge AI Apex Builder</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52]">
          <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">
            {org?.alias || 'No Org Connected'}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", org ? "bg-[#22c55e]" : "bg-red-500")}></div>
            <span className="text-[9px] text-[#22c55e]">{org ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        {/* Chat Sessions History */}
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-2 flex items-center gap-2">
           <MessageSquare className="w-3 h-3 text-[#00A1E0]" /> CHAT SESSIONS
        </div>
        <div className="flex-[0.5] overflow-y-auto no-scrollbar px-2 flex flex-col gap-1 mt-1 border-b border-[#1e3a52]/40 pb-2">
          {sessions.map((session, idx) => {
            const isActive = session.id === currentSessionId;
            return (
              <div 
                key={idx} 
                onClick={() => handleSelectSession(session)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all group",
                  isActive ? "bg-[#0d2137] border-l-2 border-[#00A1E0]" : ""
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className={cn("w-3.5 h-3.5 shrink-0 opacity-80", isActive ? "text-[#00A1E0]" : "text-[#4a7fa5]")} />
                  <span className={cn(
                    "text-[10px] font-medium truncate group-hover:text-white transition-colors",
                    isActive ? "text-[#e2e8f0]" : "text-[#7cc4e4]"
                  )}>
                    {session.title}
                  </span>
                </div>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div className="opacity-20 text-center py-4 text-[9px] italic">No active sessions</div>
          )}
        </div>

        {/* Salesforce Org Classes */}
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-2 flex items-center gap-2">
           <Terminal className="w-3 h-3" /> ORG CLASSES
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 flex flex-col gap-0.5 mt-1">
          {classes.length === 0 ? (
            <div className="p-8 flex justify-center opacity-20"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : classes.map((cls, i) => {
            const isLoaded = selectedClass?.Id === cls.Id;
            return (
              <div 
                key={i} 
                onClick={() => handleSelectClass(cls)}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 text-[10px] rounded-md cursor-pointer hover:bg-[#0d2137] transition-all",
                  isLoaded ? 'bg-[#0d2137] text-[#00A1E0] font-bold' : 'text-[#7CC4E4]'
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Code2 className="w-3 h-3 text-[#00A1E0] shrink-0" />
                  <span className="truncate">{cls.Name}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div 
          onClick={handleNewSession}
          className="px-4 py-3 text-[11px] text-[#185FA5] font-semibold cursor-pointer border-t border-[#1e3a52] hover:bg-white/5 transition-colors"
        >
          + Build new Class with AI
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#050b16]">
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center justify-between shrink-0">
          <div className="text-[13px] font-semibold flex items-center gap-2">
            AI Apex Assistant {selectedClass ? `— ${selectedClass.Name}` : ''}
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-[#031b2e] text-[#00A1E0] font-bold border border-[#00A1E0]/20 tracking-wide uppercase">Code Analysis</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 no-scrollbar">
          {!selectedClass && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20">
              <Code2 className="w-16 h-16 mb-4 text-[#00A1E0]" />
              <div className="text-center">
                <div className="text-[16px] font-bold uppercase tracking-widest text-white">Apex Refactor Assistant</div>
                <div className="text-[11px] mt-2">Select an Apex class from the sidebar or type a prompt to begin.</div>
              </div>
            </div>
          ) : messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3.5 items-start", msg.role === 'user' ? "justify-end" : "justify-start")}>
              {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-[#00A1E0] flex items-center justify-center font-bold text-white text-[12px] shrink-0 shadow-lg">AI</div>}
              <div className={cn(
                "p-4 text-[11.5px] shadow-lg leading-relaxed",
                msg.role === 'user' ? "bg-[#00A1E0] text-white rounded-l-[16px] rounded-tr-[16px] max-w-[70%]" : "bg-[#0d2137] border border-[#1e3a52] rounded-r-[16px] rounded-bl-[16px] w-full max-w-[95%]"
              )}>
                <div className={cn(msg.role === 'ai' ? "text-[#e2e8f0]" : "text-white")}>
                  {msg.role === 'ai' ? (
                    <div className="prose prose-invert max-w-none text-[12.5px] leading-relaxed prose-pre:bg-[#021427] prose-pre:border prose-pre:border-white/5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>

                {/* Technical Blueprint Plan Box */}
                {(msg.role === 'ai' && msg.plan) && (
                  <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00a1e0] animate-pulse" />
                      <span className="text-[10px] font-black text-[#00a1e0] uppercase tracking-widest">Technical Blueprint Ready</span>
                    </div>
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                       {(msg.plan.items || msg.plan.steps)?.map((step: any, sIdx: number) => (
                         <div key={sIdx} className="flex items-start gap-3">
                            <span className="text-[10px] font-bold text-white/20 mt-0.5">{sIdx + 1}.</span>
                            <span className="text-[11px] text-white/70">
                              {step.description || step.fullName || (typeof step === 'string' ? step : 'Metadata item')}
                              {step.type && <span className="ml-2 text-[9px] text-[#00a1e0] uppercase bg-[#00a1e0]/10 px-1 py-0.5 rounded">{step.type}</span>}
                            </span>
                         </div>
                       ))}
                    </div>

                    <div className="flex gap-3 mt-2">
                      <Link
                        href={`/dashboard?view=plan&id=${msg.id || 'current'}`}
                        className="px-5 py-2.5 bg-[#3fb950] hover:bg-[#3fb950]/90 text-white rounded-lg font-bold text-[11px] flex items-center gap-2 transition-all shadow-lg shadow-[#3fb950]/10"
                      >
                        Review & Deploy Changes <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {msg.hasCode && (
                  <div className="space-y-6 mt-4">
                    {msg.original && (
                      <div>
                        <div className="text-[#e2e8f0] font-semibold mb-2 text-[12px] flex items-center justify-between">
                          Current code:
                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.original)}
                            className="text-[10px] font-bold text-[#4a7fa5] hover:text-[#7CC4E4] flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="bg-[#021427] rounded-xl border border-[#1e3a52] p-5 font-mono text-[13px] text-[#e2e8f0] shadow-inner overflow-x-auto whitespace-pre no-scrollbar">
                          {msg.original}
                        </div>
                      </div>
                    )}
                    {msg.refactored && (
                      <div>
                        <div className="text-[#e2e8f0] font-semibold mb-2 text-[12px] flex items-center justify-between">
                          Refactored code (bulkified/optimized):
                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.refactored)}
                            className="text-[10px] font-bold text-[#4a7fa5] hover:text-[#7CC4E4] flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="bg-[#021427] rounded-xl border border-[#1e3a52] p-5 font-mono text-[13px] text-[#e2e8f0] shadow-inner overflow-x-auto whitespace-pre no-scrollbar">
                          {msg.refactored}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => handleDeploy(msg.refactored)}
                        disabled={compiling}
                        className="bg-[#15803D] hover:bg-[#126932] text-white px-5 py-2.5 rounded-lg text-[12px] font-bold transition-all active:scale-95 flex items-center gap-2"
                      >
                        {compiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Deploy fixed version &rarr;
                      </button>
                      <button 
                        className="bg-[#0d2137] border border-[#1e3a52] hover:bg-[#1e3a52] text-[#7CC4E4] px-5 py-2.5 rounded-lg text-[12px] font-bold transition-all active:scale-95"
                      >
                        Generate test class
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#021427] border-t border-[#1e3a52] shadow-2xl">
          {status && (
            <div className="mb-3 px-3 py-2 bg-white/5 rounded-lg flex items-center gap-2 border border-white/5">
              {status.includes('Error') ? <AlertCircle className="w-3.5 h-3.5 text-[#f87171]" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />}
              <span className="text-[10px] font-bold text-[#e2e8f0]">{status}</span>
            </div>
          )}
          <div className="relative bg-[#0d2137] border border-[#1e3a52] rounded-xl flex items-end p-2 pr-4 shadow-inner">
            <div className="relative p-2 flex items-center" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-md active:scale-95 flex items-center justify-center border border-white/5 hover:border-white/10"
              >
                <Plus className="w-4 h-4" />
              </button>
              
              {/* Plus Menu Dropdown */}
              {showMenu && (
                <div className="absolute bottom-12 left-2 w-[240px] bg-[#070e1b] border border-white/10 rounded-2xl p-2.5 flex flex-col gap-1 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left">
                    <Paperclip className="w-3.5 h-3.5 text-[#00A1E0]" />
                    Add files or photos
                  </button>
                  
                  <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left">
                    <Camera className="w-3.5 h-3.5 text-[#00A1E0]" />
                    Take a screenshot
                  </button>
                  
                  <button className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left group">
                    <div className="flex items-center gap-3">
                      <FolderPlus className="w-3.5 h-3.5 text-[#00A1E0]" />
                      Add to project
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                  
                  <button className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left group">
                    <div className="flex items-center gap-3">
                      <Compass className="w-3.5 h-3.5 text-[#00A1E0]" />
                      Skills
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                  
                  <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left">
                    <Boxes className="w-3.5 h-3.5 text-[#00A1E0]" />
                    Add connectors
                  </button>
                  
                  <div className="h-[1px] bg-white/5 my-1" />
                  
                  <button 
                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-3.5 h-3.5 text-[#00A1E0]" />
                      Web search
                    </div>
                    {webSearchEnabled && <Check className="w-3.5 h-3.5 text-[#00A1E0]" />}
                  </button>
                  
                  <button className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left group">
                    <div className="flex items-center gap-3">
                      <Palette className="w-3.5 h-3.5 text-[#00A1E0]" />
                      Use style
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                </div>
              )}
            </div>
            
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[#e2e8f0] text-[13px] py-4 px-2 placeholder:text-white/20 resize-none min-h-[56px] no-scrollbar outline-none font-medium" 
              placeholder={selectedClass ? "Ask AI about this code..." : "Ask AI to generate a new class or ask a general Apex question..."}
              rows={1}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleRefactor()}
            />
            <button 
              onClick={handleRefactor}
              disabled={loading || !prompt.trim()}
              className="mb-2 w-8 h-8 bg-[#00A1E0] hover:bg-[#0081B5] disabled:opacity-30 rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-lg shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
