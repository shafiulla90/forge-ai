'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Send, 
  Loader2, 
  Workflow, 
  CheckCircle2, 
  AlertCircle,
  Play,
  MessageSquare,
  Plus,
  Paperclip,
  Camera,
  FolderPlus,
  Compass,
  Boxes,
  Globe,
  Palette,
  Check,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowSession {
  id: string;
  title: string;
  timestamp: string;
  messages: any[];
  xml: string;
  nodes: any[];
  status: string | null;
  deployed: boolean;
}

export function FlowBuilder() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [xml, setXml] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const [sessions, setSessions] = useState<FlowSession[]>([]);
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

  // Load sessions and org on mount
  useEffect(() => {
    async function init() {
      // Fetch Connected Org
      try {
        const res = await fetch('/api/orgs');
        const data = await res.json();
        if (data && data.length > 0) {
          setOrg(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch org:', err);
      }

      // Fetch flow sessions
      const saved = localStorage.getItem('forge_flow_sessions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
          // Auto-select most recent session if available
          if (parsed.length > 0) {
            const latest = parsed[0];
            setCurrentSessionId(latest.id);
            setMessages(latest.messages);
            setXml(latest.xml);
            setNodes(latest.nodes);
            setStatus(latest.status);
          }
        } catch (e) {
          console.error('Failed to parse flow sessions:', e);
        }
      }
    }
    init();
  }, []);

  // Save sessions helper
  const saveSessions = (updated: FlowSession[]) => {
    setSessions(updated);
    localStorage.setItem('forge_flow_sessions', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const userMsg = { role: 'user', content: prompt };
    const currentPrompt = prompt;
    setPrompt('');

    let sessionId = currentSessionId;
    let updatedSessions = [...sessions];
    let activeSession: FlowSession;

    if (!sessionId) {
      // Create new session
      sessionId = Math.random().toString(36).substring(2, 11);
      const title = currentPrompt.trim().substring(0, 30) + (currentPrompt.trim().length > 30 ? '...' : '');
      activeSession = {
        id: sessionId,
        title,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [userMsg],
        xml: '',
        nodes: [],
        status: 'AI is analyzing your request...',
        deployed: false
      };
      updatedSessions = [activeSession, ...updatedSessions];
      setCurrentSessionId(sessionId);
      setMessages([userMsg]);
      setStatus('AI is analyzing your request...');
      setXml('');
      setNodes([]);
    } else {
      // Update existing session
      activeSession = updatedSessions.find(s => s.id === sessionId)!;
      activeSession.messages = [...activeSession.messages, userMsg];
      activeSession.status = 'AI is analyzing your request...';
      setMessages(activeSession.messages);
      setStatus('AI is analyzing your request...');
    }

    saveSessions(updatedSessions);

    try {
      setGenerating(true);
      
      const res = await fetch('/api/flow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, orgId: org?.id })
      });
      
      const data = await res.json();
      
      // Load latest storage to prevent race conditions
      updatedSessions = JSON.parse(localStorage.getItem('forge_flow_sessions') || '[]');
      const sessionToUpdate = updatedSessions.find(s => s.id === sessionId);
      
      if (sessionToUpdate) {
        if (data.xml) {
          const aiMsg = { 
            role: 'ai', 
            content: 'I have generated the flow design based on your requirements.',
            nodes: data.nodes,
            xml: data.xml
          };
          sessionToUpdate.xml = data.xml;
          sessionToUpdate.nodes = data.nodes || [];
          sessionToUpdate.messages = [...sessionToUpdate.messages, aiMsg];
          sessionToUpdate.status = 'Flow design generated successfully.';
          
          if (sessionId === currentSessionId || !currentSessionId) {
            setXml(data.xml);
            setNodes(data.nodes || []);
            setMessages(sessionToUpdate.messages);
            setStatus('Flow design generated successfully.');
          }
        } else {
          const aiMsg = { role: 'ai', content: 'Sorry, I failed to generate the flow logic. Please try again.' };
          sessionToUpdate.messages = [...sessionToUpdate.messages, aiMsg];
          sessionToUpdate.status = 'Error: Failed to generate flow.';
          
          if (sessionId === currentSessionId || !currentSessionId) {
            setMessages(sessionToUpdate.messages);
            setStatus('Error: Failed to generate flow.');
          }
        }
        saveSessions(updatedSessions);
      }
    } catch (err) {
      console.error(err);
      setStatus('Error generating flow.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!xml || !org) return;
    try {
      setLoading(true);
      setStatus('Deploying flow to Salesforce...');
      const res = await fetch('/api/flow/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml, orgId: org.id })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Success! Flow deployed and activated.');
        
        // Update session status to deployed: true
        if (currentSessionId) {
          const updatedSessions = JSON.parse(localStorage.getItem('forge_flow_sessions') || '[]');
          const sessionToUpdate = updatedSessions.find((s: any) => s.id === currentSessionId);
          if (sessionToUpdate) {
            sessionToUpdate.deployed = true;
            sessionToUpdate.status = 'Success! Flow deployed and activated.';
            saveSessions(updatedSessions);
          }
        }
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('Deployment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (session: FlowSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setXml(session.xml);
    setNodes(session.nodes);
    setStatus(session.status);
    setPrompt('');
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setXml('');
    setNodes([]);
    setStatus(null);
    setPrompt('');
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 no-scrollbar">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge AI Flow Builder</div>
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
        
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-2">FLOW SESSIONS</div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 flex flex-col gap-1 mt-1">
          {sessions.map((session, idx) => {
            const isActive = session.id === currentSessionId;
            
            return (
              <div 
                key={idx} 
                onClick={() => handleSelectSession(session)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all group",
                  isActive ? "bg-[#0d2137] border-l-2 border-[#00A1E0]" : ""
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className={cn("w-3.5 h-3.5 shrink-0 opacity-80", isActive ? "text-[#00A1E0]" : "text-[#4a7fa5]")} />
                  <span className={cn(
                    "text-[11px] font-medium truncate group-hover:text-white transition-colors",
                    isActive ? "text-[#e2e8f0]" : "text-[#7cc4e4]"
                  )}>
                    {session.title}
                  </span>
                </div>
                {session.deployed && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 shrink-0">
                    Active
                  </span>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div className="opacity-20 flex flex-col items-center justify-center p-4 text-center mt-8">
               <Workflow className="w-8 h-8 mb-2" />
               <div className="text-[10px]">No sessions yet. Describe an automation to start!</div>
            </div>
          )}
        </div>
        <div 
          onClick={handleNewSession}
          className="px-4 py-3 text-[11px] text-[#185FA5] font-semibold cursor-pointer border-t border-[#1e3a52] hover:bg-white/5 transition-colors"
        >
          + Build new Flow with AI
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#050b16]">
        <div className="h-[44px] bg-[#021427] border-b border-[#1e3a52] px-4 flex items-center justify-between shrink-0">
          <div className="text-[13px] font-semibold flex items-center gap-2">
            AI Flow Builder {messages.length > 0 ? '— Active Session' : ''}
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-[#031b2e] text-[#00A1E0] font-bold border border-[#00A1E0]/20 tracking-wide uppercase">Record-Triggered Flow</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 no-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20">
              <Zap className="w-16 h-16 mb-4 text-[#00A1E0]" />
              <div className="text-center">
                <div className="text-[16px] font-bold uppercase tracking-widest text-white">AI Flow Designer</div>
                <div className="text-[11px] mt-2 max-w-[300px]">Describe the automation you want to build (e.g., "When a Lead is created, send a Slack notification")</div>
              </div>
            </div>
          ) : messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3.5 items-start", msg.role === 'user' ? "justify-end" : "justify-start")}>
              {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-[#00A1E0] flex items-center justify-center font-bold text-white text-[12px] shrink-0 shadow-lg">AI</div>}
              <div className={cn(
                "p-4 text-[11.5px] max-w-[80%] shadow-lg leading-relaxed",
                msg.role === 'user' ? "bg-[#00A1E0] text-white rounded-l-[16px] rounded-tr-[16px]" : "bg-[#0d2137] border border-[#1e3a52] rounded-r-[16px] rounded-bl-[16px]"
              )}>
                {msg.content}

                {msg.nodes && (
                  <div className="bg-[#021427] rounded-xl border border-[#1e3a52] p-5 flex flex-col gap-4 shadow-inner mt-4">
                    <div className="text-[9px] font-black text-[#4a7fa5] uppercase tracking-widest mb-1 border-b border-[#1e3a52] pb-2">FLOW DESIGN</div>
                    {msg.nodes.map((node: any, nIdx: number) => (
                      <div key={nIdx} className="bg-[#0d2137] rounded-xl p-4 border border-[#1e3a52] border-l-[4px] shadow-sm" style={{ borderLeftColor: node.color || '#00A1E0' }}>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: node.color || '#00A1E0' }}>{node.type}</div>
                        <div className="text-[10.5px] text-[#e2e8f0] leading-snug">{node.label}</div>
                      </div>
                    ))}
                    <div className="flex gap-3 mt-2">
                      <button 
                        onClick={handleDeploy}
                        disabled={loading}
                        className="bg-[#15803D] hover:bg-[#126932] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 flex items-center gap-2"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Deploy & Activate Flow
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
              disabled={generating}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[#e2e8f0] text-[13px] py-4 px-2 placeholder:text-white/20 resize-none min-h-[56px] no-scrollbar outline-none font-medium" 
              placeholder="Describe the automation logic..."
              rows={1}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
            />
            <button 
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="mb-2 w-8 h-8 bg-[#00A1E0] hover:bg-[#0081B5] disabled:opacity-30 rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-lg shrink-0"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
