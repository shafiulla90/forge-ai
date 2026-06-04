'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Cloud, 
  CheckCircle2, 
  Plus,
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
      <div className="w-full max-w-[480px] flex flex-col gap-5">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center gap-1">
          <h1 className="text-[36px] font-black tracking-tighter text-[#00a1e0] leading-none">
            Forge
          </h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
            Forge — Build anything in Salesforce
          </p>
          <p className="max-w-sm text-white/30 text-[11px] leading-relaxed mt-1.5 font-medium">
            Connect your Salesforce org. AI reads your entire setup and implements anything you describe — in plain English.
          </p>
        </div>

        {/* Main Connect Card */}
        <div className="bg-[#0b1120] border border-white/5 rounded-xl shadow-2xl overflow-hidden">
          {/* Card Header Bar */}
          <div className="bg-[#1e293b]/30 border-b border-white/5 px-5 py-3">
            <h2 className="text-[15px] font-bold text-white tracking-tight">
              Connect Salesforce Org
            </h2>
            <p className="text-[9px] text-[#00a1e0] font-bold uppercase tracking-widest mt-0.5">
              OAuth 2.0 • Secure • Read + Write permissions
            </p>
          </div>

          <div className="p-5 flex flex-col gap-4">
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
