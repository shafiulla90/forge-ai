'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function JiraConnect() {
  const supabase = createClient();

  const [siteUrl, setSiteUrl] = useState('https://acme-corp.atlassian.net');
  const [projectKey, setProjectKey] = useState('SFDC');
  const [ticketType, setTicketType] = useState('Story');
  const [workflow, setWorkflow] = useState('auto-deploy');
  const [mounted, setMounted] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [importTicket, setImportTicket] = useState('');
  const [authMode, setAuthMode] = useState<'oauth' | 'basic'>('basic');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Helper to extract a ticket key from a Jira URL (e.g., /browse/PROJ-123)
  const extractTicketFromUrl = (urlStr: string): string => {
    try {
      const u = new URL(urlStr);
      const match = u.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/i);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  };


  const router = useRouter();
  const searchParams = useSearchParams();

  const [showSuccess, setShowSuccess] = useState(false);

  // Show success UI when a Jira connection is detected via query param
  useEffect(() => {
    if (searchParams?.get('connected') === 'true') {
      setShowSuccess(true);
    }
  }, [searchParams]);

  // Automatically redirect to the Jira implementation plan board after showing success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        router.push('/dashboard?view=jira-plan');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, router]);

  useEffect(() => {
    async function loadJiraConfig() {
      try {
        const res = await fetch('/api/jira/status');
        if (res.ok) {
          const data = await res.json();
          if (data.isConnected) {
            setConnection(data);
            if (data.siteUrl) setSiteUrl(data.siteUrl);
            if (data.projectKey) setProjectKey(data.projectKey);
            if (data.authMethod) setAuthMode(data.authMethod);
            if (data.email) setEmail(data.email);
          }
        }
      } catch (err) {
        console.warn('Failed to load Jira connection:', err);
      } finally {
        setMounted(true);
      }
    }
    loadJiraConfig();
  }, []);

  // Listen for postMessage from the OAuth popup to show success without reload
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.jiraConnected) {
        setShowSuccess(true);
        // Re-fetch connection info to update UI
        (async () => {
          try {
            const res = await fetch('/api/jira/status');
            if (res.ok) {
              const data = await res.json();
              if (data.isConnected) {
                setConnection(data);
                if (data.siteUrl) setSiteUrl(data.siteUrl);
                if (data.projectKey) setProjectKey(data.projectKey);
                if (data.authMethod) setAuthMode(data.authMethod);
                if (data.email) setEmail(data.email);
              }
            }
          } catch (err) {
            console.warn('Failed to re-fetch Jira status:', err);
          }
        })();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleDisconnectJira = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Clear connection by user_id to avoid wiping out other users' data
        await supabase
          .from('jira_connections')
          .delete()
          .eq('user_id', user.id);
        
        // Also clean up legacy user_configs
        await supabase
          .from('user_configs')
          .update({ jira_tokens: null })
          .eq('user_id', user.id);
      } else {
        // Fallback clear
        await supabase.from('jira_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      setConnection(null);
      setSiteUrl('https://acme-corp.atlassian.net');
      setProjectKey('SFDC');
      setImportTicket('');
      setShowSuccess(false);
    } catch (err) {
      console.error('Failed to disconnect Jira:', err);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0a1628] text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#0052CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <div className="text-[12px] font-bold tracking-wide">Loading integration settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#0a1628] p-3 font-sans overflow-y-auto no-scrollbar max-h-screen">
      <div className="w-full max-w-[390px] flex flex-col items-center py-2">

        {/* Header */}
        <div className="text-[22px] font-extrabold text-[#0052CC] mb-0.5 tracking-tight select-none">
          Jira Integration
        </div>
        <div className="text-[10.5px] text-[#4a7fa5] mb-3.5 text-center leading-normal select-none max-w-[330px]">
          Connect Jira to create tickets for every AI implementation plan. Team reviews in Jira → approves → Forge deploys to Salesforce automatically.
        </div>

        {/* HOW IT WORKS CARD */}
        <div className="w-full bg-[#0d2137] rounded-xl border border-[#1e3a52] overflow-hidden shadow-xl mb-3">
          <div className="bg-[#0052CC] px-3.5 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider select-none">
            How Jira + Forge works together
          </div>
          <div className="p-3 flex flex-col gap-2">
            {[
              { num: "1", title: "AI creates implementation plan", desc: "Forge analyses your Salesforce org and designs the changes" },
              { num: "2", title: "Forge posts a Jira ticket automatically", desc: "Full implementation spec, Salesforce changes, Apex code, risk notes — all in the ticket" },
              { num: "3", title: "Your team reviews and approves in Jira", desc: "Tech lead, architect, or manager approves within Jira — no need to come back to Forge" },
              { num: "4", title: "Forge auto-deploys to Salesforce", desc: "On ticket approval, Forge webhook fires — deploys to Sandbox or Production as configured", success: true }
            ].map((step, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 select-none ${step.success ? 'bg-[#15803D] text-white shadow-md' : 'bg-[#0052CC] text-white shadow-md'}`}> {step.num} </div>
                <div>
                  <div className="text-[10px] font-bold text-[#e2e8f0] mb-0.5 select-none">{step.title}</div>
                  <div className="text-[9px] text-[#4a7fa5] leading-normal select-none">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONNECT FORM CARD */}
        <div className="w-full bg-[#0d2137] rounded-xl border border-[#1e3a52] overflow-hidden shadow-xl">
          <div className="bg-[#0052CC] px-3.5 py-1.5 border-b border-[#1e3a52]/40 flex flex-col select-none">
            <div className="text-[11.5px] font-bold text-white tracking-tight">Connect Jira workspace</div>
            <div className="text-[9px] text-[#B3D4FF] font-medium">Link Atlassian Cloud Workspace</div>
          </div>

          <div className="p-3 flex flex-col gap-2.5">
            {/* Render based on connection state */}
            {!connection ? (
              // No connection yet – show the form
              <>
                {/* Auth Mode Tabs */}
                <div className="flex bg-[#021427] p-1 rounded-lg border border-[#1e3a52]/60 mb-1">
                  <button
                    onClick={() => { setAuthMode('basic'); setConnectError(null); }}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all cursor-pointer ${
                      authMode === 'basic' ? 'bg-[#15803D] text-white' : 'text-[#4a7fa5] hover:text-white'
                    }`}
                  >
                    API Token (Keyless)
                  </button>
                  <button
                    onClick={() => { setAuthMode('oauth'); setConnectError(null); }}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all cursor-pointer ${
                      authMode === 'oauth' ? 'bg-[#0052CC] text-white' : 'text-[#4a7fa5] hover:text-white'
                    }`}
                  >
                    OAuth 2.0 Consent
                  </button>
                </div>

                <div className="flex flex-col">
                  <label className="text-[8.5px] font-bold text-[#4a7fa5] uppercase tracking-wider mb-0.5 block select-none">Jira Site URL</label>
                  <input
                    className="w-full bg-[#021427] border border-[#1e3a52] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#0052CC] transition-all placeholder:text-[#1a3050]"
                    placeholder="https://your-company.atlassian.net"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    onBlur={() => {
                      const val = siteUrl.trim();
                      try {
                        // Accept both plain site URLs and full ticket URLs
                        const urlObj = new URL(val);
                        // Always keep the origin as the site URL used for OAuth
                        setSiteUrl(urlObj.origin);
                        // If the URL contains a /browse/<KEY> path, extract the ticket key
                        const ticketMatch = urlObj.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/i);
                        if (ticketMatch && ticketMatch[1]) {
                          const ticketKey = ticketMatch[1].toUpperCase();
                          setImportTicket(ticketKey);
                          // Derive the project key from the ticket prefix
                          const proj = ticketKey.split('-')[0];
                          setProjectKey(proj);
                        }
                        // Also handle /projects/<KEY> URLs for project selection
                        const projectMatch = urlObj.pathname.match(/\/projects\/([A-Z0-9]+)/i);
                        if (projectMatch && projectMatch[1]) {
                          setProjectKey(projectMatch[1].toUpperCase());
                        }
                      } catch (e) {
                        // Not a valid URL – do nothing; user can manually type fields
                      }
                    }}
                  />
                </div>

                {authMode === 'basic' && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-[8.5px] font-bold text-[#4a7fa5] uppercase tracking-wider mb-0.5 block select-none">Jira Account Email</label>
                      <input
                        className="w-full bg-[#021427] border border-[#1e3a52] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#15803D] transition-all placeholder:text-[#1a3050]"
                        placeholder="e.g. your-jira-email@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[8.5px] font-bold text-[#4a7fa5] uppercase tracking-wider mb-0.5 block select-none flex items-center justify-between">
                        <span>Jira API Token</span>
                        <a 
                          href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#00a1e0] hover:underline normal-case font-bold tracking-wide"
                        >
                          Generate Token ↗
                        </a>
                      </label>
                      <input
                        className="w-full bg-[#021427] border border-[#1e3a52] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#15803D] transition-all placeholder:text-[#1a3050]"
                        placeholder="Paste ATATT... API token here"
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col">
                  <label className="text-[8.5px] font-bold text-[#4a7fa5] uppercase tracking-wider mb-0.5 block select-none">Default Project</label>
                  <input
                    className="w-full bg-[#021427] border border-[#1e3a52] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#0052CC] transition-all placeholder:text-[#1a3050]"
                    placeholder="e.g. SFDC or ORG-IMPL"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[8.5px] font-bold text-[#4a7fa5] uppercase tracking-wider mb-0.5 block select-none">Default Ticket Type for AI Plans</label>
                  <div className="relative">
                    <select
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="w-full bg-[#021427] border border-[#1e3a52] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#0052CC] transition-all appearance-none cursor-pointer"
                    >
                      <option>Story</option>
                      <option>Task</option>
                      <option>Change Request</option>
                      <option>Epic</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a7fa5]"><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg></div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-[8.5px] font-bold text-[#4a7fa5] uppercase tracking-wider mb-0.5 block select-none">Approval Workflow</label>
                  <div className="relative">
                    <select
                      value={workflow}
                      onChange={(e) => setWorkflow(e.target.value)}
                      className="w-full bg-[#021427] border border-[#1e3a52] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#0052CC] transition-all appearance-none cursor-pointer"
                    >
                      <option value="auto-deploy">Ticket moved to "Approved" → auto-deploy to Sandbox</option>
                      <option value="prod-deploy">Ticket moved to "Approved" → auto-deploy to Production</option>
                      <option value="manual">Ticket approved → notify in Forge, deploy manually</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a7fa5]"><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg></div>
                  </div>
                </div>

                {connectError && (
                  <div className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-500/20 rounded-lg p-2.5 leading-normal">
                    ⚠️ {connectError}
                  </div>
                )}

                <div className="mt-1">
                  {authMode === 'oauth' ? (
                    <button
                      onClick={() => {
                        const finalImportTicket = importTicket || extractTicketFromUrl(siteUrl);
                        const connectApiUrl = `/api/jira/connect?siteUrl=${encodeURIComponent(siteUrl)}&projectKey=${encodeURIComponent(projectKey)}&ticketType=${encodeURIComponent(ticketType)}&workflow=${encodeURIComponent(workflow)}&importTicket=${encodeURIComponent(finalImportTicket)}`;
                        // Open OAuth flow in a centered popup to avoid full page reload
                        const width = 600;
                        const height = 700;
                        const left = window.screenX + (window.innerWidth - width) / 2;
                        const top = window.screenY + (window.innerHeight - height) / 2;
                        window.open(connectApiUrl, 'jira-connect', `width=${width},height=${height},left=${left},top=${top}`);
                      }}
                      className="w-full bg-[#0052CC] hover:bg-[#0047b3] text-white font-bold py-2.5 rounded-lg text-[11.5px] flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider shadow-lg shadow-[#0052CC]/15 cursor-pointer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      Connect Jira via Atlassian OAuth
                    </button>
                  ) : (
                    <button
                      disabled={connecting}
                      onClick={async () => {
                        setConnecting(true);
                        setConnectError(null);
                        try {
                          const res = await fetch('/api/jira/connect/basic', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              siteUrl,
                              email,
                              apiToken,
                              projectKey,
                              ticketType,
                              workflow
                            })
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            setShowSuccess(true);
                            setConnection(data);
                          } else {
                            setConnectError(data.error || 'Failed to authenticate. Please verify your Email and API Token.');
                          }
                        } catch (err: any) {
                          setConnectError(err.message || 'An unexpected connection error occurred.');
                        } finally {
                          setConnecting(false);
                        }
                      }}
                      className="w-full bg-[#15803D] hover:bg-[#166534] disabled:bg-[#15803D]/40 text-white font-bold py-2.5 rounded-lg text-[11.5px] flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider shadow-lg shadow-[#15803D]/15 cursor-pointer"
                    >
                      {connecting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                          Verifying credentials...
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          Connect Jira via API Token
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : showSuccess ? (
              // Show success confirmation after OAuth
              <div className="p-3 bg-[#0d2f17]/70 border border-[#15803D]/50 rounded-xl flex flex-col gap-2 text-center">
                <span className="font-bold text-[#22c55e] block mb-1 text-[14px]">✓ Jira Connected Successfully</span>
                <p className="text-[12px] text-[#e2e8f0]">Your Jira workspace is now linked. You will be redirected to your board shortly.</p>
              </div>
            ) : (
              // Already connected – show info and actions
              <div className="p-3 bg-[#0d2f17]/70 border border-[#15803D]/50 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-[#22c55e] tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shrink-0"></span>
                    JIRA CONNECTED
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/dashboard?view=jira-plan" className="text-[9px] font-bold text-white hover:underline bg-[#0052CC] px-2 py-0.5 rounded border border-[#0052CC] transition-all uppercase tracking-widest shrink-0">View Implementation Plan</Link>
                    <button onClick={handleDisconnectJira} className="text-[9px] font-bold text-red-400 hover:text-red-300 hover:underline bg-red-950/30 px-2 py-0.5 rounded border border-red-500/20 transition-all uppercase tracking-widest shrink-0">Disconnect</button>
                  </div>
                </div>
                <div className="text-[9.5px] text-[#86b595] leading-relaxed">
                  Workspace: <span className="text-white font-mono">{connection.site_url || connection.siteUrl}</span><br />
                  Default Project Key: <span className="text-white font-mono">{connection.project_key || connection.projectKey}</span><br />
                  Connection Type: <span className="text-[#a78bfa] font-bold uppercase tracking-wider">{connection.authMethod === 'basic' || connection.auth_method === 'basic' ? 'API Token (Keyless)' : 'OAuth 2.0'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
