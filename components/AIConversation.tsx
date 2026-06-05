'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Database, 
  History as HistoryIcon, 
  Settings, 
  Activity,
  Mic,
  Paperclip,
  Send,
  Zap,
  Box,
  Workflow,
  Code2,
  Lock,
  BarChart3,
  Stethoscope,
  ChevronRight,
  Loader2,
  Camera,
  FolderPlus,
  Compass,
  Boxes,
  Globe,
  Palette,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrg, getCurrentUser } from '@/lib/supabase-helpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const preprocessMarkdown = (content: string): string => {
  if (!content) return '';
  return content.replace(/(!?\[.*?\])\((.*?)\)/g, (match, label, url) => {
    if (url.includes(' ') && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
      const encodedUrl = url.replace(/\s/g, '%20');
      return `${label}(${encodedUrl})`;
    }
    return match;
  });
};

const quickActions = [
  { icon: Box, title: 'Create custom object', desc: 'New object with fields, layouts, and permissions', color: 'text-orange-500', prompt: 'Help me create a new custom object for tracking...' },
  { icon: Workflow, title: 'Build automation flow', desc: 'Triggered, scheduled, or screen Flow', color: 'text-blue-500', prompt: 'I want to build a Flow that triggers when...' },
  { icon: Code2, title: 'Write Apex code', desc: 'Trigger, class, batch, or fix existing code', color: 'text-purple-500', prompt: 'Write an Apex Trigger for...' },
  { icon: Lock, title: 'Fix security / permissions', desc: 'Profiles, permission sets, sharing rules', color: 'text-yellow-500', prompt: 'Help me fix a permissions issue where...' },
];

export function AIConversation() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [isNewConvoFlash, setIsNewConvoFlash] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const [showMenu, setShowMenu] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // High fidelity functionality states
  const [attachments, setAttachments] = useState<any[]>([]);
  const [screenshotAttached, setScreenshotAttached] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Apex Generator']);
  const [selectedStyle, setSelectedStyle] = useState<string>('Professional');
  const [showProjectSubmenu, setShowProjectSubmenu] = useState(false);
  const [showSkillsSubmenu, setShowSkillsSubmenu] = useState(false);
  const [showStyleSubmenu, setShowStyleSubmenu] = useState(false);
  const [flashScreen, setFlashScreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    triggerToast("⏹ Chat generation stopped.");
  };

  // Close plus menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowProjectSubmenu(false);
        setShowSkillsSubmenu(false);
        setShowStyleSubmenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Show transient toast helper
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Simulate screenshot
  const handleTakeScreenshot = () => {
    setFlashScreen(true);
    setShowMenu(false);
    setTimeout(() => {
      setFlashScreen(false);
      
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#020817';
        ctx.fillRect(0, 0, 800, 600);
        
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(10, 10, 220, 580);
        ctx.fillRect(240, 10, 550, 580);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Forge Workspace Snapshot', 260, 50);
        
        ctx.fillStyle = '#00a1e0';
        ctx.fillRect(260, 80, 200, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('Active Org: ' + (org?.alias || 'Connected'), 280, 130);
      }
      
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      const newAttachment = {
        name: 'Workspace_Screenshot_' + Date.now() + '.png',
        type: 'image/png',
        base64: base64
      };
      
      setAttachments(prev => [...prev, newAttachment]);
      setScreenshotAttached(true);
      triggerToast("📸 Workspace screenshot captured & attached!");
    }, 1500);
  };

  // File Picker change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          const newAttachment = {
            name: file.name,
            type: file.type,
            base64: base64
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
      
      triggerToast(`📎 Attached ${filesArray.length} file(s) successfully!`);
      setShowMenu(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            const newAttachment = {
              name: 'Clipboard_Image_' + Date.now() + '.png',
              type: file.type,
              base64: base64
            };
            setAttachments(prev => [...prev, newAttachment]);
            setScreenshotAttached(true);
            triggerToast("📸 Screenshot pasted from clipboard & attached!");
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // 1. Fetch Org & Initial Data
  useEffect(() => {
    async function init() {
      const activeOrg = await getActiveOrg(supabase);
      if (activeOrg) {
        setOrg(activeOrg);
        
        // Load only the conversations belonging to this specific user and active org!
        const user = await getCurrentUser(supabase);
        if (user) {
          const { data: convos } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', user.id)
            .eq('org_id', activeOrg.id)
            .order('created_at', { ascending: false });
            
          if (convos) {
            setConversations(convos);
            const partnerConvo = convos.find(c => c.title && c.title.toLowerCase().includes('partner referral'));
            if (partnerConvo) {
              setCurrentConvoId(partnerConvo.id);
            } else if (convos.length > 0) {
              setCurrentConvoId(convos[0].id);
            }
          }
        }
      }
    }
    init();
  }, []);

  // Load messages when currentConvoId changes
  useEffect(() => {
    if (!currentConvoId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', currentConvoId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (msgs) {
          const formatted = msgs.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            plan: m.implementation_plan,
            requiresOrgConnect: m.requiresOrgConnect || false
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      }
    }
    loadMessages();
  }, [currentConvoId]);

  // 2. Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle New Conversation
  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConvoId(null);
    setInput('');
    setIsNewConvoFlash(true);
    setTimeout(() => setIsNewConvoFlash(false), 300);
  };

  // 3. Handle Send
  const handleSend = async (overridePrompt?: string) => {
    const text = overridePrompt || input;
    if (!text.trim()) return;

    const currentAttachments = [...attachments];
    setAttachments([]);
    setScreenshotAttached(false);

    const userMessage = { 
      role: 'user', 
      content: text,
      attachments: currentAttachments
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    setLoading(true);

    try {
      let convoId = currentConvoId;
      // Client-Side Conversation Creation
      if (!convoId) {
        const { data: newConvo } = await supabase.from('conversations').insert({
          user_id: (await getCurrentUser(supabase))?.id,
          org_id: org?.id || null,
          title: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        }).select().single();
        
        if (newConvo) {
          convoId = newConvo.id;
          setCurrentConvoId(newConvo.id);
          // Refresh list
          const { data: convos } = await supabase.from('conversations').select('*').order('created_at', { ascending: false });
          if (convos) setConversations(convos);
        }
      }

      // Save user message to database
      if (convoId) {
        let dbContent = text;
        if (currentAttachments.length > 0) {
          currentAttachments.forEach((att: any) => {
            dbContent += `\n\n[Attached File: ${att.name}]`;
          });
        }
        await supabase.from('messages').insert({
          role: 'user',
          content: dbContent,
          conversation_id: convoId
        });
      }

      const newMessages = [...messages, userMessage];

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          orgId: org?.id || null,
          conversationId: convoId,
          attachments: currentAttachments
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      // Handle Streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: 'assistant', content: '' };
      
      setMessages(prev => [...prev, assistantMessage]);

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
                assistantMessage.content += data.text;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...assistantMessage };
                  return newMsgs;
                });
              } else if (data.type === 'plan') {
                // Attach the plan to the message for rendering
                assistantMessage = { ...assistantMessage, ...data };
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...assistantMessage };
                  return newMsgs;
                });
              }
            } catch (e) { /* ignore parse errors for partial chunks */ }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020817]">
      {/* Sidebar */}
      <div className="w-[240px] border-r border-white/5 flex flex-col p-4 gap-6 shrink-0">
        <div className="flex flex-col gap-1 px-2">
          <span className="text-[14px] font-black text-white tracking-tight">Forge</span>
          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Forge AI Builder</span>
        </div>

        <div className="bg-[#0b1120] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-white tracking-tight leading-none truncate">
              {org?.alias || 'No Org Connected'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1 h-1 rounded-full", org ? "bg-[#3fb950]" : "bg-red-500")} />
            <span className={cn("text-[8px] font-black uppercase tracking-widest", org ? "text-[#3fb950]" : "text-red-500")}>
              {org ? 'Connected - Synced' : 'Disconnected'}
            </span>
          </div>
        </div>

        <button 
          onClick={handleNewConversation}
          className={cn(
            "w-full py-2.5 text-white rounded-lg font-black text-[10px] shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest transition-all",
            isNewConvoFlash ? "bg-white text-[#00a1e0] scale-95" : "bg-[#00a1e0] hover:scale-[1.02]"
          )}
        >
          <Plus className="w-3 h-3" />
          New conversation
        </button>

        <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] px-2">Recent</span>
            <nav className="flex flex-col gap-0.5">
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setCurrentConvoId(convo.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-bold transition-all text-left truncate",
                    currentConvoId === convo.id ? "bg-[#1e293b] text-white" : "text-white/30 hover:bg-white/5"
                  )}
                >
                  <MessageSquare className={cn("w-3 h-3", currentConvoId === convo.id ? "text-[#00a1e0]" : "text-white/20")} />
                  {convo.title || 'Untitled Conversation'}
                </button>
              ))}
              {conversations.length === 0 && (
                <span className="text-[9px] text-white/10 px-3 italic">No history yet</span>
              )}
            </nav>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] px-2">Navigate</span>
            <nav className="flex flex-col gap-0.5">
              <Link href="/dashboard?view=health" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/30 hover:bg-white/5 text-[10px] font-bold transition-all">
                <Activity className="w-3 h-3" />
                Org health check
              </Link>
              <Link href="/dashboard?view=meta" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/30 hover:bg-white/5 text-[10px] font-bold transition-all">
                <Database className="w-3 h-3" />
                Metadata explorer
              </Link>
              <Link href="/dashboard?view=history" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/30 hover:bg-white/5 text-[10px] font-bold transition-all">
                <HistoryIcon className="w-3 h-3" />
                History
              </Link>
              <Link href="/dashboard?view=settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/30 hover:bg-white/5 text-[10px] font-bold transition-all">
                <Settings className="w-3 h-3" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-8 h-[60px] border-b border-white/5 bg-[#020817]/80 backdrop-blur-md">
          <h2 className="text-[12px] font-bold text-white tracking-tight uppercase">
            AI Conversation {org ? `— ${org.alias}` : ''}
          </h2>
          {org && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#3fb950]/10 rounded-full border border-[#3fb950]/20">
                <div className="w-1 h-1 rounded-full bg-[#3fb950]" />
                <span className="text-[8px] text-[#3fb950] font-black uppercase tracking-tighter">Metadata Synced</span>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Chat Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-8 flex flex-col gap-8 pb-32">
          {messages.length === 0 && (
            <>
              {/* Quick Start Grid */}
              <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Quick Start — tap to use</span>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <button 
                      key={action.title} 
                      onClick={() => handleSend(action.prompt)}
                      className="bg-[#0b1120] border border-white/5 rounded-xl p-4 flex gap-4 hover:border-white/10 transition-all text-left group"
                    >
                      <div className={cn("w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", action.color)}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-white">{action.title}</span>
                        <span className="text-[9px] text-white/30 leading-tight">{action.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center py-4 max-w-4xl mx-auto w-full">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="px-4 text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">Or type your request below</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
            </>
          )}

          {/* Chat Bubbles */}
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                {msg.role === 'assistant' && (
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", msg.requiresOrgConnect ? "bg-red-500" : "bg-[#00a1e0]")}>
                    {msg.requiresOrgConnect ? <span className="text-white text-xs font-bold">!</span> : <Zap className="w-4 h-4 text-white" />}
                  </div>
                )}
                <div className={cn(
                  "rounded-2xl px-6 py-4 max-w-[85%] shadow-lg transition-all",
                  msg.role === 'user' 
                    ? "bg-[#00a1e0] text-white rounded-tr-none" 
                    : "bg-[#0b1120] border border-white/5 text-white rounded-tl-none",
                  msg.requiresOrgConnect && "border-red-500/30 shadow-red-500/5"
                )}>
                  {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {msg.attachments.map((att: any, attIdx: number) => (
                        <div key={attIdx} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5 shadow-md max-w-[240px]">
                          {att.type?.startsWith('image/') ? (
                            <img 
                              src={`data:${att.type};base64,${att.base64}`} 
                              alt={att.name} 
                              className="max-h-[140px] object-cover rounded-lg block" 
                            />
                          ) : (
                            <div className="p-3 text-[10px] text-white/80 flex items-center gap-2">
                              <Paperclip className="w-3.5 h-3.5 text-[#00A1E0]" />
                              <span className="truncate max-w-[150px]">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[13px] font-medium leading-relaxed prose prose-invert prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 max-w-none prose-headings:text-white prose-a:text-[#00a1e0] prose-strong:text-white">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => {
                          const safeHref = href && typeof href === 'string' ? href.replace(/\s/g, '%20') : '';
                          if (safeHref && (safeHref.endsWith('.mp4') || safeHref.includes('mixkit.co'))) {
                            return (
                              <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg max-w-full">
                                <video src={safeHref} controls className="w-full h-auto max-h-[360px] block" />
                              </div>
                            );
                          }
                          return <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-[#00a1e0] hover:underline font-bold">{children}</a>;
                        },
                        img: ({ src, alt }) => {
                          const safeSrc = src && typeof src === 'string' ? src.replace(/\s/g, '%20') : '';
                          return (
                            <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-white/5 shadow-lg max-w-full">
                              <img src={safeSrc} alt={alt} className="w-full h-auto max-h-[360px] object-contain block" suppressHydrationWarning />
                            </div>
                          );
                        }
                      }}
                    >
                      {preprocessMarkdown(msg.content.split('<plan>')[0].trim())}
                    </ReactMarkdown>
                  </div>

                  {/* Connect Org Action Button */}
                  {msg.requiresOrgConnect && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <Link
                        href="/dashboard?view=connect"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00a1e0] hover:bg-[#00a1e0]/90 text-white rounded-lg font-bold text-[11px] transition-all shadow-lg shadow-[#00a1e0]/10"
                      >
                        Connect Salesforce Org <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}

                  {/* Mockup buttons inside the chat bubble */}
                  {msg.role === 'assistant' && msg.content.includes('Shall I proceed?') && (
                    <div className="flex gap-[7px] mt-2.5">
                      <Link 
                        href={`/dashboard?view=plan&id=${msg.id || 'current'}`}
                        className="bg-[#15803D] hover:bg-[#126b33] text-white border-none rounded-lg py-1.5 px-3.5 text-[10.5px] font-bold cursor-pointer transition-all shadow-md"
                      >
                        Yes — show me the plan →
                      </Link>
                      <button className="bg-[#1e3a52] hover:bg-[#1a3247] text-[#7CC4E4] border-none rounded-lg py-1.5 px-3 text-[10.5px] font-bold cursor-pointer transition-all">
                        Make changes first
                      </button>
                    </div>
                  )}

                  {/* Implementation Plan Box */}
                  {(msg.role === 'assistant' && msg.plan && !msg.content.includes('Shall I proceed?')) && (
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
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#00a1e0] flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-[#0b1120] border border-white/5 text-white/40 rounded-2xl rounded-tl-none px-6 py-4 italic text-[11px]">
                  Analyzing org metadata and forging plan...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#020817] via-[#020817] to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 bg-[#00a1e0]/5 blur-xl rounded-2xl group-focus-within:bg-[#00a1e0]/10 transition-all" />
            <div className={cn(
              "relative bg-[#0b1120] border rounded-2xl flex items-end p-2 pr-4 shadow-2xl transition-all",
              org ? "border-white/10 focus-within:border-[#00a1e0]/30" : "border-red-500/30 focus-within:border-red-500/50"
            )}>
              <div className="relative p-2 flex items-center" ref={menuRef}>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-md active:scale-95 flex items-center justify-center border border-white/5 hover:border-white/10"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Hidden File Picker Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  className="hidden" 
                />
                
                {/* Plus Menu Dropdown */}
                {showMenu && (
                  <div className="absolute bottom-12 left-2 w-[240px] bg-[#070e1b] border border-white/10 rounded-2xl p-2.5 flex flex-col gap-1 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button 
                      onClick={() => { fileInputRef.current?.click(); }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left w-full"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#00A1E0]" />
                      Add files or photos
                    </button>
                    
                    <button 
                      onClick={handleTakeScreenshot}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left w-full"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#00A1E0]" />
                      Take a screenshot
                    </button>
                    
                    {/* Add to project */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowProjectSubmenu(!showProjectSubmenu);
                          setShowSkillsSubmenu(false);
                          setShowStyleSubmenu(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <FolderPlus className="w-3.5 h-3.5 text-[#00A1E0]" />
                          Add to project
                        </div>
                        <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                      </button>

                      {showProjectSubmenu && (
                        <div className="absolute bottom-0 left-[245px] w-[200px] bg-[#070e1b] border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl z-[60]">
                          <div className="px-2.5 py-1 text-[9px] font-extrabold text-white/30 uppercase tracking-wider">Select Project</div>
                          {['Acme Sandbox', 'EduTrack Managed Package', 'Forge Core Pipeline'].map(proj => (
                            <button
                              key={proj}
                              onClick={() => {
                                setActiveProject(proj);
                                setShowProjectSubmenu(false);
                                setShowMenu(false);
                                triggerToast(`📂 Attached to project: ${proj}`);
                              }}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left"
                            >
                              {proj}
                              {activeProject === proj && <Check className="w-3 h-3 text-[#00A1E0]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Skills */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowSkillsSubmenu(!showSkillsSubmenu);
                          setShowProjectSubmenu(false);
                          setShowStyleSubmenu(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Compass className="w-3.5 h-3.5 text-[#00A1E0]" />
                          Skills
                        </div>
                        <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                      </button>

                      {showSkillsSubmenu && (
                        <div className="absolute bottom-0 left-[245px] w-[200px] bg-[#070e1b] border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl z-[60]">
                          <div className="px-2.5 py-1 text-[9px] font-extrabold text-white/30 uppercase tracking-wider">Select Skills</div>
                          {['Apex Generator', 'Flow Builder', 'Jira Connector'].map(skill => {
                            const isSel = selectedSkills.includes(skill);
                            return (
                              <button
                                key={skill}
                                onClick={() => {
                                  if (isSel) {
                                    setSelectedSkills(prev => prev.filter(s => s !== skill));
                                  } else {
                                    setSelectedSkills(prev => [...prev, skill]);
                                  }
                                }}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left"
                              >
                                {skill}
                                {isSel && <Check className="w-3 h-3 text-[#00A1E0]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => {
                        setShowMenu(false);
                        triggerToast("🧊 Connector Workspace Active!");
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left w-full"
                    >
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
                    
                    {/* Use Style */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowStyleSubmenu(!showStyleSubmenu);
                          setShowProjectSubmenu(false);
                          setShowSkillsSubmenu(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Palette className="w-3.5 h-3.5 text-[#00A1E0]" />
                          Use style
                        </div>
                        <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                      </button>

                      {showStyleSubmenu && (
                        <div className="absolute bottom-0 left-[245px] w-[180px] bg-[#070e1b] border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl z-[60]">
                          <div className="px-2.5 py-1 text-[9px] font-extrabold text-white/30 uppercase tracking-wider">Select Style</div>
                          {['Professional', 'Creative', 'Strict Apex'].map(st => (
                            <button
                              key={st}
                              onClick={() => {
                                setSelectedStyle(st);
                                setShowStyleSubmenu(false);
                                setShowMenu(false);
                                triggerToast(`🎨 Applied AI response style: ${st}`);
                              }}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left"
                            >
                              {st}
                              {selectedStyle === st && <Check className="w-3 h-3 text-[#00A1E0]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Toast Messages */}
              {toast && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#00A1E0] text-white text-[10px] font-extrabold px-4 py-2 rounded-full shadow-2xl z-[999] animate-bounce">
                  {toast}
                </div>
              )}

              {/* Shutter Flash Overlay */}
              {flashScreen && (
                <div className="fixed inset-0 bg-white/95 z-[9999] flex flex-col items-center justify-center animate-pulse duration-75">
                  <div className="text-black font-black text-[15px] tracking-widest uppercase flex items-center gap-3 animate-bounce">
                    <Camera className="w-8 h-8 text-[#00A1E0]" /> CAPTURING WORKSPACE SCREENSHOT...
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                {/* Active Badges/Context Row */}
                {(activeProject || selectedSkills.length > 0 || selectedStyle !== 'Professional' || webSearchEnabled) && (
                  <div className="flex flex-wrap gap-1.5 px-2 pt-2 border-b border-white/5 pb-2 mb-1.5">
                    {webSearchEnabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00a1e0]/10 text-[#00a1e0] text-[9px] font-bold border border-[#00a1e0]/20">
                        <Globe className="w-2.5 h-2.5" /> Web Search Active
                      </span>
                    )}
                    {activeProject && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[9px] font-bold border border-purple-500/20">
                        <FolderPlus className="w-2.5 h-2.5" /> Project: {activeProject}
                        <button onClick={() => setActiveProject(null)} className="ml-1 text-white/40 hover:text-white">&times;</button>
                      </span>
                    )}
                    {selectedStyle !== 'Professional' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-bold border border-amber-500/20">
                        <Palette className="w-2.5 h-2.5" /> Style: {selectedStyle}
                        <button onClick={() => setSelectedStyle('Professional')} className="ml-1 text-white/40 hover:text-white">&times;</button>
                      </span>
                    )}
                    {selectedSkills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                        <Compass className="w-2.5 h-2.5" /> Skill: {skill}
                        <button onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))} className="ml-1 text-white/40 hover:text-white">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Visual Attachment Preview Grid */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1 border-b border-white/5">
                    {attachments.map((att: any, attIdx: number) => (
                      <div key={attIdx} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5 shadow-md w-14 h-14 shrink-0">
                        {att.type?.startsWith('image/') ? (
                          <img 
                            src={`data:${att.type};base64,${att.base64}`} 
                            alt={att.name} 
                            className="w-full h-full object-cover block" 
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-[#0b1120] text-center">
                            <Paperclip className="w-3.5 h-3.5 text-[#00A1E0] mb-0.5" />
                            <span className="text-[7px] text-white/80 truncate w-full px-1">{att.name}</span>
                          </div>
                        )}
                        <button 
                          type="button"
                          onClick={() => {
                            setAttachments(prev => prev.filter((_, idx) => idx !== attIdx));
                            const remaining = attachments.filter((_, idx) => idx !== attIdx);
                            const hasImages = remaining.some(f => f.type?.startsWith('image/'));
                            if (!hasImages) {
                              setScreenshotAttached(false);
                            }
                          }}
                          className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold shadow-md opacity-90 hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onPaste={handlePaste}
                  placeholder={org ? "Describe what you want to build in your Salesforce org..." : "Type your request (connect an org first)..."}
                  disabled={loading}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white text-[13px] py-4 px-2 placeholder:text-white/10 resize-none min-h-[56px] no-scrollbar font-medium"
                  rows={1}
                />
              </div>
              <button 
                onClick={loading ? handleStop : () => handleSend()}
                disabled={!loading && !input.trim()}
                className={cn(
                  "mb-2 p-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center border group",
                  loading 
                    ? "bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 hover:scale-105" 
                    : "bg-[#00a1e0] border-transparent text-white hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                )}
              >
                {loading ? (
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin block group-hover:hidden" />
                    <div className="w-2.5 h-2.5 bg-red-500 group-hover:bg-white rounded-[2px] hidden group-hover:block" />
                  </div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
