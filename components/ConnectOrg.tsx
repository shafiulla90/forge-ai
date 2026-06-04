'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Cloud, 
  CheckCircle2, 
  Plus,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const orgTypes = [
  { id: 'production', name: 'Production', desc: 'Live org' },
  { id: 'sandbox', name: 'Sandbox', desc: 'Test env' },
  { id: 'developer', name: 'Developer', desc: 'Dev Edition' },
  { id: 'scratch', name: 'Scratch', desc: 'SFDX' },
];

const permissions = [
  "Read metadata (all objects, fields, Apex, Flows)",
  "Deploy metadata (after your approval)",
  "Run Apex tests post-deployment",
  "No data access — metadata only"
];

export function ConnectOrg() {
  const searchParams = useSearchParams();
  const stage = searchParams ? searchParams.get('stage') || '' : '';
  const initialType = stage === 'qa' || stage === 'uat' ? 'sandbox' : 'production';

  const [selectedType, setSelectedType] = useState(initialType);
  const [alias, setAlias] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('https://forge-ai-gsn9.vercel.app/api/auth/salesforce/callback');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Defer rendering to client-side to prevent password manager extension hydration errors
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="flex-1 bg-[#020817] min-h-screen" />;
  }

  const handleConnect = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      alert('Salesforce Client ID and Client Secret are required.');
      return;
    }
    const params = new URLSearchParams();
    if (selectedType) params.append('type', selectedType);
    if (alias) params.append('alias', alias);
    if (stage) params.append('stage', stage);
    params.append('clientId', clientId.trim());
    params.append('clientSecret', clientSecret.trim());
    window.location.href = `/api/auth/salesforce?${params.toString()}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center pt-8 pb-6 px-6 bg-[#020817] min-h-screen overflow-y-auto">
      <div className="w-full max-w-[960px] flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center gap-1">
          <h1 className="text-[36px] font-black tracking-tighter text-[#00a1e0] leading-none">
            Forge
          </h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
            Forge — Build anything in Salesforce
          </p>
          <p className="max-w-md text-white/30 text-[11px] leading-relaxed mt-1.5 font-medium">
            Connect your Salesforce org. AI reads your entire setup and implements anything you describe — in plain English.
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch justify-center w-full">
          
          {/* Main Connect Card */}
          <div className="flex-1 w-full bg-[#0b1120] border border-white/5 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Card Header Bar */}
            <div className="bg-[#1e293b]/30 border-b border-white/5 px-5 py-3">
              <h2 className="text-[15px] font-bold text-white tracking-tight">
                Connect Salesforce Org
              </h2>
              <p className="text-[9px] text-[#00a1e0] font-bold uppercase tracking-widest mt-0.5">
                OAuth 2.0 • Secure • Read + Write permissions
              </p>
            </div>

            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* Org Type Grid */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em]">
                  SELECT ORG TYPE
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {orgTypes.map((type) => (
                    <button
                      key={type.id}
                      suppressHydrationWarning={true}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-lg border transition-all",
                        selectedType === type.id
                          ? "bg-[#1e293b] border-white/20 text-white"
                          : "bg-black/20 border-white/5 text-white/25 hover:border-white/10"
                      )}
                    >
                      <span className="text-[11px] font-bold tracking-tight">{type.name}</span>
                      <span className="text-[8px] font-semibold opacity-50 uppercase">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Client ID Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em]">
                  SALESFORCE CLIENT ID (CONSUMER KEY)
                </label>
                <input
                  type="text"
                  placeholder="Enter Consumer Key"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2.5 text-[12px] text-white focus:outline-none focus:border-white/10 transition-all placeholder:text-white/10 font-medium"
                  required
                />
              </div>

              {/* Client Secret Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em]">
                  SALESFORCE CLIENT SECRET (CONSUMER SECRET)
                </label>
                <input
                  type="password"
                  placeholder="Enter Consumer Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2.5 text-[12px] text-white focus:outline-none focus:border-white/10 transition-all placeholder:text-white/10 font-medium"
                  required
                />
              </div>

              {/* Alias Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em]">
                  ORG ALIAS (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Production"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2.5 text-[12px] text-white focus:outline-none focus:border-white/10 transition-all placeholder:text-white/10 font-medium"
                />
              </div>

              {/* Action Button */}
              <button
                suppressHydrationWarning={true}
                onClick={handleConnect}
                className="w-full py-3 bg-[#00a1e0] hover:bg-[#008cc2] text-white rounded-lg font-bold text-[13px] shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                <Cloud className="w-4 h-4" />
                Connect via Salesforce OAuth
              </button>

              {/* Permissions Info */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em]">
                  PERMISSIONS REQUESTED
                </label>
                <div className="flex flex-col gap-1">
                  {permissions.map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-[#3fb950] shrink-0" />
                      <span className="text-[10px] font-medium text-[#3fb950]/80">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Connected App Setup Instructions Card */}
          <div className="flex-1 w-full bg-[#0b1120] border border-white/5 rounded-xl shadow-2xl overflow-hidden self-stretch flex flex-col">
            <div className="bg-[#1e293b]/30 border-b border-white/5 px-5 py-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00a1e0]" />
              <h3 className="text-[13px] font-bold text-white tracking-tight">
                Salesforce Connected App Setup Guide
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-3.5 text-[11.5px] text-white/60 leading-relaxed font-medium flex-1 justify-between">
              <div className="flex flex-col gap-3">
                {/* Action Required Box */}
                <div className="p-3 bg-[#00a1e0]/10 border border-[#00a1e0]/20 rounded-lg flex flex-col gap-1 text-[11px] text-[#00a1e0]">
                  <span className="font-bold uppercase tracking-wider text-[9.5px]">🔑 Action Required:</span>
                  <span className="text-white/75 leading-relaxed font-semibold">
                    You must create a Connected App in your Salesforce Org to obtain the Client ID & Secret before you can connect.
                  </span>
                </div>

                <ol className="list-decimal list-inside flex flex-col gap-2.5">
                  <li>
                    Log into your target Org, go to <strong className="text-white">Setup ➔ App Manager</strong>, and click <strong className="text-white">New Connected App</strong>.
                  </li>
                  <li>
                    Check the <strong className="text-white">Enable OAuth Settings</strong> box and set the <strong className="text-white">Callback URL</strong> to:
                    <div className="flex items-center gap-2 mt-1.5 p-2 bg-black/30 border border-white/5 rounded-lg text-white font-mono text-[9px] break-all select-all">
                      <span>https://forge-ai-gsn9.vercel.app/api/auth/salesforce/callback</span>
                      <button 
                        onClick={handleCopy}
                        className="ml-auto p-1 bg-white/5 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </li>
                  <li>
                    Select and add these <strong className="text-white">OAuth Scopes</strong>:
                    <ul className="list-disc list-inside ml-4 mt-1 flex flex-col gap-1 text-white/50 font-mono text-[9.5px]">
                      <li>Access the Salesforce API (api)</li>
                      <li>Perform requests on your behalf at any time (refresh_token, offline_access)</li>
                      <li>Full access (full)</li>
                    </ul>
                  </li>
                  <li>
                    Keep <strong className="text-white">Require Secret for Web Server Flow</strong> checked.
                  </li>
                  <li>
                    Save and click <strong className="text-white">Manage Consumer Details</strong>. Verify your identity to reveal:
                    <ul className="list-disc list-inside ml-4 mt-1 flex flex-col gap-1 text-white/70 font-semibold">
                      <li><span className="text-white">Consumer Key</span> ➔ Paste into <strong className="text-[#00a1e0]">Salesforce Client ID</strong></li>
                      <li><span className="text-white">Consumer Secret</span> ➔ Paste into <strong className="text-[#00a1e0]">Salesforce Client Secret</strong></li>
                    </ul>
                  </li>
                </ol>
              </div>
              
              <div className="mt-3 p-2 bg-[#1e293b]/20 border border-[#00a1e0]/10 rounded-lg flex gap-2">
                <span className="text-[10px] text-[#00a1e0] font-bold shrink-0">TIP:</span>
                <span className="text-white/45 text-[10px] leading-snug">
                  If the "New Connected App" button is missing, search Setup for <strong>External Client Apps ➔ Settings</strong> and turn <strong>Allow creation of connected apps</strong> to ON.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Link */}
        <button 
          suppressHydrationWarning={true}
          className="text-[10px] font-bold text-white/15 hover:text-white/30 transition-colors self-center tracking-wider"
        >
          Already connected? Manage orgs →
        </button>

        {/* Bottom Org Cards */}
        <div className="flex items-center justify-center gap-2.5 pb-6">
           <div className="flex flex-col gap-0.5 p-3 bg-[#0b1120] border border-white/5 rounded-lg min-w-[140px]">
              <span className="text-[10px] font-bold text-white tracking-tight">Acme Corp - Prod</span>
              <span className="text-[8px] text-white/30 font-semibold">Production • 248 objects</span>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                <span className="text-[8px] text-[#3fb950] font-bold">Active</span>
              </div>
           </div>

           <div className="flex flex-col gap-0.5 p-3 bg-[#0b1120] border border-white/5 rounded-lg min-w-[140px]">
              <span className="text-[10px] font-bold text-white tracking-tight">Acme Corp - Sandbox</span>
              <span className="text-[8px] text-white/30 font-semibold">Sandbox • Full copy</span>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a1e0]" />
                <span className="text-[8px] text-[#00a1e0] font-bold">Connected</span>
              </div>
           </div>

           <button 
             suppressHydrationWarning={true}
             className="flex items-center justify-center gap-1.5 p-3 border border-dashed border-white/5 rounded-lg min-w-[100px] h-full text-white/15 hover:text-white/30 transition-all group"
           >
             <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform" />
             <span className="text-[9px] font-bold uppercase tracking-wider">Add org</span>
           </button>
        </div>
      </div>
    </div>
  );
}
