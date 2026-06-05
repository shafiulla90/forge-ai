'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export function JiraBoard() {
  const [columns, setColumns] = useState<any>({
    todo: [],
    review: [],
    approved: [],
    deployed: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sprintName, setSprintName] = useState('Active Sprint');
  const [dateRange, setDateRange] = useState('Current');
  const [isConnected, setIsConnected] = useState(false);

  async function handleDisconnect() {
    try {
      const res = await fetch('/api/jira/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      // Refresh board data after disconnect
      await fetchBoardData();
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message);
    }
  }

  async function fetchBoardData(isSilent = false) {
    try {
      // Forward all relevant URL params (importTicket, connected, mock) to the board API
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      urlParams.delete('view'); // Don't send UI view param to the API
      const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
      const res = await fetch(`/api/jira/board${query}`);
      if (!res.ok) throw new Error('Failed to retrieve Kanban columns');
      const data = await res.json();
      console.log('Fetched board data:', data);
      if (data.success && data.columns) {
        setColumns(data.columns);
        setIsConnected(data.isConnected ?? false);
        if (data.sprintName) setSprintName(data.sprintName);
        if (data.dateRange) setDateRange(data.dateRange);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('forge_jira_board', JSON.stringify(data));
        }
      }
    } catch (err: any) {
      console.error(err);
      if (!isSilent) setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Attempt to load from cache first for instant render
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('forge_jira_board');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.columns) {
            setColumns(data.columns);
            setIsConnected(data.isConnected ?? false);
            if (data.sprintName) setSprintName(data.sprintName);
            if (data.dateRange) setDateRange(data.dateRange);
            setLoading(false);
          }
        } catch (e) {}
      }
    }

    const hasCache = typeof window !== 'undefined' && sessionStorage.getItem('forge_jira_board');
    fetchBoardData(!!hasCache);

    const interval = setInterval(() => {
      fetchBoardData(true);
    }, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0a1628] text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#0052CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <div className="text-[12px] font-bold tracking-wide">Syncing Atlassian Board...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#0a1628] text-[#e2e8f0] font-sans overflow-hidden">
      {/* Jira Top Nav */}
      <div className="h-[50px] bg-[#0052CC] px-6 flex items-center gap-3 shrink-0 shadow-lg">
        <div className="text-[15px] font-black text-white tracking-tight">Jira Software</div>
        <span className="text-[#B3D4FF] text-[13px] opacity-40">/</span>
        <div className="text-[12px] font-bold text-[#B3D4FF]">SFDC · Salesforce Board</div>
        <div className="ml-4 flex items-center gap-2">
          {["Backlog", "Active Board", "Releases", "Issues"].map((item, i) => (
            <div key={i} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${item === 'Active Board' ? 'bg-white/20 text-white' : 'text-[#B3D4FF] hover:bg-white/10'}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isConnected ? (
            <div className="bg-[#032D60] text-[#7CC4E4] text-[8.5px] font-extrabold px-3 py-1 rounded-md flex items-center gap-1.5 border border-[#7CC4E4]/10 select-none">
              <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></div>
              ⚡ PIPELINE SYNCED
            </div>
          ) : (
            <div className="bg-[#2D0F1A] text-[#FCA5A5] text-[8.5px] font-extrabold px-3 py-1 rounded-md flex items-center gap-1.5 border border-[#FCA5A5]/10 select-none">
              <div className="w-1.5 h-1.5 bg-[#ef4444] rounded-full"></div>
              ⚡ DISCONNECTED
            </div>
          )}
          {isConnected && (
            <button onClick={handleDisconnect} className="bg-[#0d2137]/40 hover:bg-[#ff6b6b]/20 text-[#ff8e8e] text-[8.5px] font-bold px-3 py-1 rounded-md border border-[#ff8e8e]/20 transition-all duration-200 uppercase tracking-widest">
              Disconnect
            </button>
          )}
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/10 shrink-0">RK</div>
        </div>
      </div>

      {/* Sprint Info Bar */}
      <div className="h-[44px] bg-[#0d2137] border-b border-[#1e3a52] px-6 flex items-center gap-3 shrink-0">
        <span className="text-[12px] font-extrabold text-white">{sprintName}</span>
        <span className="text-[10px] text-[#4a7fa5] font-semibold">{dateRange}</span>
        {isConnected && (
          <span className="text-[8.5px] font-extrabold px-2.5 py-0.5 rounded bg-[#0d2f17] text-[#4ade80] border border-[#15803D]/20 uppercase tracking-widest">In progress</span>
        )}
        
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={() => fetchBoardData(false)}
            className="flex items-center gap-1.5 bg-[#021427] border border-[#1e3a52] hover:bg-[#031b2e] px-3 py-1 text-[10.5px] text-[#7cc4e4] rounded-lg transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh Board
          </button>
        </div>
      </div>

      {/* Kanban Board Layout */}
      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center bg-[#050b16] p-6 relative overflow-hidden">
          {/* Decorative glowing gradient blur spheres */}
          <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-[#0052CC] opacity-10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/3 w-[250px] h-[250px] bg-[#7c3aed] opacity-10 rounded-full blur-[70px] pointer-events-none"></div>
          
          <div className="relative backdrop-blur-xl bg-[#0d2137]/65 border border-[#1e3a52]/70 rounded-[28px] p-10 max-w-[480px] text-center shadow-2xl flex flex-col items-center gap-6 border-t-[#2563eb]/30 shadow-[#000000]/40 transition-all duration-300 hover:border-[#2563eb]/50">
            {/* Stunning Logo Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0052CC]/25 to-[#0087FF]/5 border border-[#0052CC]/30 flex items-center justify-center shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0087FF" strokeWidth="2.5" className="animate-pulse">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[20px] font-black tracking-tight text-white select-none">Jira Workspace Not Connected</h2>
              <p className="text-[12.5px] text-[#7ea5c9] leading-relaxed max-w-[380px] select-none">
                Jira Workspace Not Connected. Connect your Atlassian Jira workspace to view the active sprint board, import issues, and track your Salesforce deployment pipelines.
              </p>
            </div>

            {/* Premium Button */}
            <Link 
              href="/dashboard?view=jira-connect" 
              className="mt-2 px-6 py-3.5 bg-gradient-to-r from-[#0052CC] to-[#0087FF] hover:from-[#0047B3] hover:to-[#0073E6] text-white font-extrabold text-[11.5px] rounded-xl flex items-center gap-2 shadow-lg shadow-[#0052CC]/25 hover:shadow-[#0052CC]/40 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-widest"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Connect Jira Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-5 items-start bg-[#050b16] no-scrollbar">
          
          {/* TO DO Column */}
          <div className="w-[280px] bg-[#0d2137] rounded-2xl flex flex-col shrink-0 max-h-full shadow-2xl border border-[#1e3a52]/40">
            <div className="p-4 pb-2 text-[10px] font-black text-[#4a7fa5] uppercase tracking-widest flex items-center justify-between">
              TO DO <span className="bg-[#021427] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black">{columns.todo.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[calc(100vh-220px)]">
              {columns.todo.map((item: any, i: number) => (
                <Link 
                  key={i}
                  href={`/dashboard?view=jira-approve&id=${item.id}`}
                  className="bg-[#021427] border border-[#1e3a52] rounded-xl p-4 cursor-pointer hover:border-[#0052CC] hover:shadow-lg transition-all group"
                >
                  <div className="text-[9px] font-black text-[#0052CC] mb-1.5 font-mono tracking-wider">{item.key}</div>
                  <div className="text-[11.5px] font-bold text-[#e2e8f0] leading-snug mb-3.5 group-hover:text-white line-clamp-3">{item.title}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-[#1e3a52] text-[#7CC4E4] border border-[#1e3a52]/40 uppercase tracking-widest">TO DO</span>
                    <div className="bg-[#032D60] text-[#7CC4E4] text-[7.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">⚡ FORGE</div>
                    <div className="ml-auto w-4.5 h-4.5 bg-[#0052CC] rounded-full flex items-center justify-center text-[7.5px] font-extrabold text-white border border-[#0d2137]">{item.assigneeInitials || 'RK'}</div>
                  </div>
                </Link>
              ))}
              {columns.todo.length === 0 && (
                <div className="opacity-20 text-center py-8 text-[10px] italic">No tickets in To Do</div>
              )}
            </div>
          </div>

          {/* IN REVIEW Column */}
          <div className="w-[280px] bg-[#0d2137] rounded-2xl border border-[#D97706]/20 flex flex-col shrink-0 max-h-full shadow-2xl">
            <div className="p-4 pb-2 text-[10px] font-black text-[#FCD34D] uppercase tracking-widest flex items-center justify-between">
              IN REVIEW <span className="bg-[#3f2d00] text-[#FCD34D] px-2.5 py-0.5 rounded-full text-[9px] font-black">{columns.review.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[calc(100vh-220px)]">
              {columns.review.map((item: any, i: number) => (
                <Link 
                  key={i}
                  href={`/dashboard?view=jira-approve&id=${item.id}`}
                  className="bg-[#031b2e] border border-[#0052CC]/50 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-[#0052CC]/10 hover:border-[#0052CC] transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-[9px] font-black text-[#0052CC] font-mono tracking-wider">{item.key}</div>
                    <div className="bg-[#032D60] text-[#7CC4E4] text-[7.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">⚡ FORGE</div>
                  </div>
                  <div className="text-[11.5px] font-bold text-[#e2e8f0] leading-snug mb-3 group-hover:text-white line-clamp-3">{item.title}</div>
                  <div className="bg-[#3f2d00]/70 text-[#FCD34D] text-[9.5px] font-extrabold px-3 py-2 rounded-xl mb-3.5 leading-snug border border-[#D97706]/15">
                    ⏳ Awaiting approval to deploy
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-[#3f2d00] text-[#FCD34D] border border-[#D97706]/20 uppercase tracking-widest">IN REVIEW</span>
                      <span className="text-[9px] text-[#FCD34D] font-extrabold">{item.points || '1'} pt</span>
                    </div>
                    <div className="w-4.5 h-4.5 bg-[#0052CC] rounded-full flex items-center justify-center text-[7.5px] font-extrabold text-white border border-[#0d2137]">{item.assigneeInitials || 'RK'}</div>
                  </div>
                </Link>
              ))}
              {columns.review.length === 0 && (
                <div className="opacity-20 text-center py-8 text-[10px] italic">No tickets in Review</div>
              )}
            </div>
          </div>

          {/* APPROVED Column */}
          <div className="w-[280px] bg-[#0d2137] rounded-2xl border border-[#15803D]/20 flex flex-col shrink-0 max-h-full shadow-2xl">
            <div className="p-4 pb-2 text-[10px] font-black text-[#4ade80] uppercase tracking-widest flex items-center justify-between">
              APPROVED <span className="bg-[#0d2f17] text-[#4ade80] px-2.5 py-0.5 rounded-full text-[9px] font-black">{columns.approved.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[calc(100vh-220px)]">
              {columns.approved.map((item: any, i: number) => (
                <Link 
                  key={i}
                  href={`/dashboard?view=jira-approve&id=${item.id}`}
                  className="bg-[#021427] border border-[#15803D]/60 rounded-xl p-4 cursor-pointer hover:border-[#15803D] hover:shadow-lg hover:shadow-[#15803D]/10 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-[9px] font-black text-[#0052CC] font-mono tracking-wider">{item.key}</div>
                    <div className="bg-[#032D60] text-[#7CC4E4] text-[7.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">⚡ FORGE</div>
                  </div>
                  <div className="text-[11.5px] font-bold text-[#e2e8f0] leading-snug mb-3 group-hover:text-white line-clamp-3">{item.title}</div>
                  <div className="bg-[#0d2f17]/80 text-[#4ade80] text-[9.5px] font-extrabold px-3 py-2 rounded-xl mb-3.5 leading-snug border border-[#15803D]/20">
                    ✅ Approved · Auto-deploying...
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-[#0d2f17] text-[#4ade80] border border-[#15803D]/20 uppercase tracking-widest">APPROVED</span>
                    </div>
                    <div className="w-4.5 h-4.5 bg-[#DC2626] rounded-full flex items-center justify-center text-[7.5px] font-extrabold text-white border border-[#0d2137]">{item.assigneeInitials || 'RK'}</div>
                  </div>
                </Link>
              ))}
              {columns.approved.length === 0 && (
                <div className="opacity-20 text-center py-8 text-[10px] italic">No approved tickets</div>
              )}
            </div>
          </div>

          {/* DEPLOYED Column */}
          <div className="w-[280px] bg-[#0d2137] rounded-2xl flex flex-col shrink-0 max-h-full shadow-2xl border border-[#1e3a52]/40">
            <div className="p-4 pb-2 text-[10px] font-black text-[#7da5c9] uppercase tracking-widest flex items-center justify-between">
              DEPLOYED <span className="bg-[#021427] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black">{columns.deployed.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[calc(100vh-220px)]">
              {columns.deployed.map((item: any, i: number) => (
                <Link 
                  key={i}
                  href={`/dashboard?view=jira-approve&id=${item.id}`}
                  className="bg-[#021427] border border-[#1e3a52]/60 rounded-xl p-4 opacity-70 hover:opacity-100 hover:border-[#7c3aed] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="text-[9px] font-black text-[#0052CC] font-mono tracking-wider">{item.key}</div>
                    <div className="bg-[#032D60] text-[#7CC4E4] text-[7.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">⚡ FORGE</div>
                  </div>
                  <div className="text-[11.5px] font-bold text-[#e2e8f0] leading-snug mb-3 group-hover:text-white line-clamp-3">{item.title}</div>
                  <div className="bg-[#0d2f17]/40 text-[#4ade80] text-[9.5px] font-extrabold px-3 py-1.5 rounded-xl mb-3.5 border border-[#15803D]/10">
                    ✅ Deployed successfully
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-[#1e0d3f] text-[#a78bfa] border border-[#7c3aed]/20 uppercase tracking-widest">DEPLOYED</span>
                    <div className="w-4.5 h-4.5 bg-[#0052CC] rounded-full flex items-center justify-center text-[7.5px] font-extrabold text-white border border-[#0d2137]">{item.assigneeInitials || 'RK'}</div>
                  </div>
                </Link>
              ))}
              {columns.deployed.length === 0 && (
                <div className="opacity-20 text-center py-8 text-[10px] italic">No deployed tickets</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
