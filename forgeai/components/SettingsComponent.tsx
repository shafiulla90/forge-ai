'use client';

import React, { useState } from 'react';

export function SettingsComponent() {
  const [safetyRules, setSafetyRules] = useState([
    { id: 'approval', title: "Require approval before every deployment", sub: "AI will always show plan and wait for your confirmation", checked: true },
    { id: 'sandbox', title: "Sandbox-first mode", sub: "All changes deploy to Sandbox before Production can be enabled", checked: false },
    { id: 'rollback', title: "Auto-rollback on Apex test failure", sub: "If post-deploy Apex tests fail, revert the deployment automatically", checked: true },
    { id: 'block', title: "Block Production deployments after 6 PM", sub: "Prevent after-hours changes to Production without override", checked: true }
  ]);

  const [metadataSync, setMetadataSync] = useState(true);

  const toggleRule = (id: string) => {
    setSafetyRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, checked: !rule.checked } : rule
    ));
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#020b16] border-r border-[#1a3050] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#1a3050]">
          <div className="text-[12px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[8.5px] text-[#3a6a90] mt-0.5">Forge AI Builder</div>
        </div>
        <div className="m-2 p-2 bg-[#0d1f35] rounded-lg border border-[#1a3050]">
          <div className="text-[10.5px] font-semibold text-[#e2e8f0]">Acme Corp · Production</div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
            <span className="text-[8.5px] text-[#22c55e]">Connected</span>
          </div>
        </div>
        <div className="px-[13px] py-[6px] text-[8.5px] font-bold text-[#3a6a90] tracking-wider mt-2 uppercase">SETTINGS SECTIONS</div>
        {[
          { text: "Connected orgs", active: true },
          { text: "AI preferences" },
          { text: "Deployment rules" },
          { text: "Notifications" },
          { text: "Team & billing" },
          { text: "Audit log" }
        ].map((item, i) => (
          <div key={i} className={`px-[13px] py-[8px] text-[10.5px] cursor-pointer transition-all ${
            item.active ? 'bg-[#0d2a42] text-[#185FA5] border-l-2 border-[#00a1e0]' : 'text-[#5a9fd4] hover:bg-[#0d1f35]'
          }`}>
            {item.text}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inner Top Bar */}
        <div className="h-[44px] bg-[#020b16] border-b border-[#1a3050] px-4 flex items-center shrink-0">
          <div className="text-[12px] font-semibold">Settings — Forge AI</div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Connected Orgs */}
          <div className="bg-[#0d1f35] rounded-xl border border-[#1a3050] overflow-hidden shrink-0">
            <div className="bg-[#031b2e] px-[14px] py-[9px] flex items-center gap-2 border-b border-[#1a3050]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Connected Salesforce Orgs</div>
            </div>
            <div className="flex flex-col">
              {[
                { name: "Acme Corp · Production", sub: "login.salesforce.com · Last synced 2 min ago · 248 objects", status: "Active" },
                { name: "Acme Corp · Sandbox", sub: "test.salesforce.com · Full copy sandbox · Last synced 1 hour ago", status: "Active" }
              ].map((org, i) => (
                <div key={i} className="flex items-center justify-between p-[11px] px-[14px] border-b border-[#1a3050] last:border-none">
                  <div>
                    <div className="text-[11.5px] font-medium text-[#e2e8f0]">{org.name}</div>
                    <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">{org.sub}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] font-bold px-2 py-0.5 rounded bg-[#0d2f17] text-[#4ade80]">Active</span>
                    <button className="text-[9.5px] px-2.5 py-1 rounded bg-[#3f0d0d] text-[#f87171] hover:bg-[#5a1414] transition-colors">Disconnect</button>
                  </div>
                </div>
              ))}
              <div className="p-[11px] px-[14px] text-[11.5px] text-[#185FA5] font-semibold cursor-pointer hover:bg-white/5 transition-colors">+ Add new Salesforce org</div>
            </div>
          </div>

          {/* Deployment Safety Rules */}
          <div className="bg-[#0d1f35] rounded-xl border border-[#1a3050] overflow-hidden shrink-0">
            <div className="bg-[#031b2e] px-[14px] py-[9px] flex items-center gap-2 border-b border-[#1a3050]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Deployment Safety Rules</div>
            </div>
            <div className="flex flex-col">
              {safetyRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-[11px] px-[14px] border-b border-[#1a3050]">
                  <div>
                    <div className="text-[11.5px] font-medium text-[#e2e8f0]">{rule.title}</div>
                    <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">{rule.sub}</div>
                  </div>
                  <div 
                    onClick={() => toggleRule(rule.id)}
                    className={`relative w-[38px] h-5 rounded-full cursor-pointer transition-colors ${rule.checked ? 'bg-[#00A1E0]' : 'bg-[#1e3a52]'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${rule.checked ? 'left-[19px]' : 'left-0.5'}`}></div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-[11px] px-[14px]">
                <div>
                  <div className="text-[11.5px] font-medium text-[#e2e8f0]">Rollback window</div>
                  <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">How long AI keeps deployment rollback available</div>
                </div>
                <span className="text-[10.5px] text-[#4a7fa5] cursor-pointer">24 hours ›</span>
              </div>
            </div>
          </div>

          {/* AI Model Preferences */}
          <div className="bg-[#0d1f35] rounded-xl border border-[#1a3050] overflow-hidden shrink-0">
            <div className="bg-[#031b2e] px-[14px] py-[9px] flex items-center gap-2 border-b border-[#1a3050]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">AI Model Preferences</div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between p-[11px] px-[14px] border-b border-[#1a3050]">
                <div>
                  <div className="text-[11.5px] font-medium text-[#e2e8f0]">Primary AI model</div>
                  <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">Used for implementation, code generation, complex analysis</div>
                </div>
                <span className="text-[10.5px] text-[#4a7fa5] cursor-pointer">Claude Sonnet ›</span>
              </div>
              <div className="flex items-center justify-between p-[11px] px-[14px] border-b border-[#1a3050]">
                <div>
                  <div className="text-[11.5px] font-medium text-[#e2e8f0]">Fast lookups model</div>
                  <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">Used for quick metadata searches and classification</div>
                </div>
                <span className="text-[10.5px] text-[#4a7fa5] cursor-pointer">Claude Haiku ›</span>
              </div>
              <div className="flex items-center justify-between p-[11px] px-[14px]">
                <div>
                  <div className="text-[11.5px] font-medium text-[#e2e8f0]">Automatic org metadata sync</div>
                  <div className="text-[9.5px] text-[#4a7fa5] mt-0.5">Re-read org metadata before each conversation</div>
                </div>
                <div 
                  onClick={() => setMetadataSync(!metadataSync)}
                  className={`relative w-[38px] h-5 rounded-full cursor-pointer transition-colors ${metadataSync ? 'bg-[#00A1E0]' : 'bg-[#1e3a52]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${metadataSync ? 'left-[19px]' : 'left-0.5'}`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Team & Billing */}
          <div className="bg-[#0d1f35] rounded-xl border border-[#1a3050] overflow-hidden shrink-0">
            <div className="bg-[#031b2e] px-[14px] py-[9px] flex items-center gap-2 border-b border-[#1a3050]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7CC4E4" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <div className="text-[11px] font-bold text-[#7CC4E4] uppercase tracking-wider">Team & Billing — Professional Plan</div>
            </div>
            <div className="flex flex-col">
              {[
                { label: "Plan", val: "Professional · ₹14,999/month ›" },
                { label: "Orgs connected", val: "2 / 3 allowed" },
                { label: "AI actions this month", val: "847 / unlimited" },
                { label: "Team members", val: "3 / 5 seats ›" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-[11px] px-[14px] border-b border-[#1a3050] last:border-none">
                  <div className="text-[11.5px] font-medium text-[#e2e8f0]">{item.label}</div>
                  <span className="text-[10.5px] text-[#4a7fa5]">{item.val}</span>
                </div>
              ))}
              <div className="p-[11px] px-[14px] text-[11.5px] text-[#185FA5] font-semibold cursor-pointer hover:bg-white/5 transition-colors">Upgrade to Enterprise · Unlimited orgs + SI partner features</div>
            </div>
          </div>
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
