'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Cloud, 
  CheckCircle2, 
  Terminal, 
  ArrowRight, 
  Loader2, 
  Server, 
  Settings, 
  KeyRound, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SfdxOrg {
  username: string;
  aliases: string[];
  instanceUrl: string;
  orgId: string;
  loginUrl: string;
  isDevHub: boolean;
}

export default function SetupPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<SfdxOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingUser, setConnectingUser] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch local SFDX orgs on mount
  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch('/api/auth/sfdx-orgs');
        const data = await res.json();
        if (data.success) {
          setOrgs(data.orgs || []);
        } else {
          setError(data.error || 'Failed to scan SFDX directory');
        }
      } catch (err: any) {
        setError('Error connecting to local SFDX detector API');
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  const handleConnectSfdx = async (username: string) => {
    setConnectingUser(username);
    setError(null);
    setStatusMessage('Reading local credentials...');

    try {
      // Step 1: Read and decrypt local token
      setTimeout(() => setStatusMessage('Decrypting token with local keychain...'), 1000);
      
      // Step 2: Establish connection and register in database
      setTimeout(() => setStatusMessage('Registering organization and querying metadata...'), 2500);

      const response = await fetch('/api/auth/sfdx-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const result = await response.json();

      if (result.success && result.orgId) {
        setStatusMessage('Authentication successful! Opening dashboard...');
        setTimeout(() => {
          router.push(`/dashboard?orgId=${result.orgId}`);
        }, 1000);
      } else {
        setError(result.error || 'Failed to connect org');
        setConnectingUser(null);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during connection');
      setConnectingUser(null);
    }
  };

  // Removed OAuth fallback function
  return (
    <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-12 px-6 bg-[#020817] min-h-screen text-white overflow-y-auto">
      <div className="w-full max-w-[560px] flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-[42px] font-black tracking-tighter text-[#00a1e0] leading-none">
            Forge AI
          </h1>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.25em] font-bold mt-1">
            Connect Your Salesforce Org
          </p>
          <div className="max-w-md text-white/50 text-[12px] leading-relaxed mt-2 font-medium flex flex-col gap-1">
            <p className="text-white"><strong>Step 1:</strong> Run <code>sfdx auth:web:login</code> in your terminal</p>
            <p className="text-white"><strong>Step 2:</strong> Click the 'Detect My Orgs' button below if your org doesn't appear.</p>
          </div>
        </div>

        {/* Connection Status / Loader */}
        {connectingUser && (
          <div className="bg-[#0b1120] border border-[#00a1e0]/20 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-[0_0_50px_rgba(0,161,224,0.05)] animate-in zoom-in-95 duration-300">
            <Loader2 className="w-10 h-10 text-[#00a1e0] animate-spin" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-white">Connecting {connectingUser}</h3>
              <p className="text-xs text-white/40 font-mono tracking-tight">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && !connectingUser && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex gap-3 items-start animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider">Connection Error</span>
              <p className="text-xs font-medium opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {!connectingUser && (
          <div className="bg-[#0b1120] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Card Title */}
            <div className="bg-[#1e293b]/30 border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00a1e0]" />
                  Detected Local SFDX Orgs
                </h2>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                  Select an active local sandbox or developer hub
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <span className="bg-[#00a1e0]/10 border border-[#00a1e0]/20 text-[#00a1e0] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                  {orgs.length} Found
                </span>
                <button 
                  onClick={() => {
                    setLoading(true);
                    fetch('/api/auth/sfdx-orgs')
                      .then(r => r.json())
                      .then(d => setOrgs(d.orgs || []))
                      .finally(() => setLoading(false));
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold uppercase px-3 py-1 rounded-full transition-colors"
                >
                  Detect My Orgs
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="p-6 flex flex-col gap-4">
              {loading ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-[#00a1e0] animate-spin" />
                  <span className="text-xs text-white/30 font-medium">Scanning local credentials...</span>
                </div>
              ) : orgs.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center gap-3">
                  <Server className="w-10 h-10 text-white/10" />
                  <p className="text-xs text-white/40 max-w-xs font-medium">
                    No local SFDX organizations found in your home directory `.sfdx`.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto no-scrollbar">
                  {orgs.map((org) => {
                    const hasAlias = org.aliases && org.aliases.length > 0;
                    const primaryAlias = hasAlias ? org.aliases[0] : org.username.split('@')[0];
                    const isSandbox = org.instanceUrl.includes('sandbox') || org.loginUrl.includes('test');

                    return (
                      <div 
                        key={org.username}
                        className="group flex items-center justify-between p-3.5 bg-black/20 border border-white/5 hover:border-white/10 rounded-xl transition-all"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-[#00a1e0] transition-colors">
                              {primaryAlias}
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold uppercase px-1.5 py-0.25 rounded-full border",
                              isSandbox
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            )}>
                              {isSandbox ? 'Sandbox' : 'Production'}
                            </span>
                            {org.isDevHub && (
                              <span className="bg-[#00a1e0]/10 border border-[#00a1e0]/20 text-[#00a1e0] text-[8px] font-bold uppercase px-1.5 py-0.25 rounded-full">
                                DevHub
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/30 font-mono tracking-tight truncate max-w-[320px]">
                            {org.username}
                          </span>
                        </div>

                        <button
                          onClick={() => handleConnectSfdx(org.username)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-[#00a1e0] border border-white/10 hover:border-transparent text-[10px] font-bold rounded-lg transition-all"
                        >
                          Connect
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* End of Content List */}
            </div>
          </div>
        )}

        {/* Footer / Instructions */}
        <p className="text-center text-[10px] text-white/20 font-medium tracking-wide">
          Forge AI respects your privacy. Local keys are decrypted locally and encrypted with your secret key before being stored in the database.
        </p>

      </div>
    </div>
  );
}
