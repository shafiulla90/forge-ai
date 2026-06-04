import { cookies } from 'next/headers';
import { decrypt } from '@/lib/encryption';
import { ConnectOrg } from '@/components/ConnectOrg';
import { OrgHealth } from '@/components/OrgHealth';
import { AIConversation } from '@/components/AIConversation';
import { SettingsComponent } from '@/components/SettingsComponent';
import { ShieldCheck, Calendar, RefreshCw, Server, Zap, ExternalLink } from 'lucide-react';
import { ReviewPlan } from '@/components/ReviewPlan';
import { Deployment } from '@/components/Deployment';
import { ApexBuilder } from '@/components/ApexBuilder';
import { FlowBuilder } from '@/components/FlowBuilder';
import { MetadataExplorer } from '@/components/MetadataExplorer';
import { History } from '@/components/History';
import { JiraConnect } from '@/components/JiraConnect';
import { JiraPost } from '@/components/JiraPost';
import { JiraBoard } from '@/components/JiraBoard';
import { JiraApprove } from '@/components/JiraApprove';

import { JiraBuild } from '@/components/JiraBuild';
import { AIBuilding } from '@/components/AIBuilding';
import { AIEval } from '@/components/AIEval';
import { HumanReview } from '@/components/HumanReview';
import { GitPR } from '@/components/GitPR';
import { OrgPipeline } from '@/components/OrgPipeline';
import { PromoteOrg } from '@/components/PromoteOrg';
import { FullFlow } from '@/components/FullFlow';
import { ActiveOrgSync } from '@/components/ActiveOrgSync';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const cookieStore = await cookies();
  const encryptedTokens = cookieStore.get('sf_tokens')?.value;
  const { view } = await searchParams;

  let tokenData = null;
  if (encryptedTokens) {
    try {
      const decrypted = decrypt(encryptedTokens);
      if (decrypted) {
        tokenData = JSON.parse(decrypted);
      }
    } catch (e) {
      console.error('Failed to decrypt tokens', e);
    }
  }

  // Pipeline Views
  if (view === 'p-s1') return <JiraBuild />;
  if (view === 'p-s2') return <AIBuilding />;
  if (view === 'p-s3') return <AIEval />;
  if (view === 'p-s4') return <HumanReview />;
  if (view === 'p-s5') return <GitPR />;
  if (view === 'p-s6') return <OrgPipeline />;
  if (view === 'p-s7') return <PromoteOrg />;
  if (view === 'p-s8') return <FullFlow />;

  // Show specialized views if explicitly requested via navbar
  if (view === 'health') {
    return <OrgHealth />;
  }

  if (view === 'chat') {
    return <AIConversation />;
  }

  if (view === 'settings') {
    return <SettingsComponent />;
  }

  if (view === 'plan') return <ReviewPlan />;
  if (view === 'deploy') return <Deployment />;
  if (view === 'apex') return <ApexBuilder />;
  if (view === 'flow') return <FlowBuilder />;
  if (view === 'meta') return <MetadataExplorer />;
  if (view === 'history') return <History />;
  if (view === 'jira-connect') return <JiraConnect />;
  if (view === 'jira-post' || view === 'jira-plan') return <JiraPost />;
  if (view === 'jira-board') return <JiraBoard />;
  if (view === 'jira-approve') return <JiraApprove />;

  // Show connect screen if explicitly requested OR if not authenticated
  if (view === 'connect' || !tokenData) {
    return <ConnectOrg />;
  }
  return (
    <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto no-scrollbar animate-in fade-in duration-700">
      <ActiveOrgSync instanceUrl={tokenData?.instance_url} />
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Org Dashboard</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <Server className="w-3.5 h-3.5" />
            Connected to {tokenData?.instance_url || 'No Org Connected'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Metadata
          </button>
          <a 
            href="/api/auth/salesforce" 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-[0_10px_20px_rgba(47,129,247,0.2)] hover:scale-[1.02] transition-all"
          >
            Re-authenticate
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-card border border-white/5 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-forge-success/10 blur-3xl rounded-full group-hover:bg-forge-success/20 transition-all" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forge-success/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-forge-success" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Connection</span>
              <span className="text-sm font-bold text-forge-success">Active & Secure</span>
            </div>
          </div>
          <div className="h-px bg-white/5 w-full" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Access Token</span>
              <span className="font-mono text-white/60 truncate max-w-[120px]">{tokenData?.access_token?.substring(0, 15) || '••••••••'}...</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Issued At</span>
              <span className="text-white/60 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {tokenData?.issued_at ? new Date(parseInt(tokenData.issued_at, 10)).toLocaleString() : new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* AI Health Card */}
        <div className="bg-card border border-white/5 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">AI Readiness</span>
              <span className="text-sm font-bold text-primary">Metadata Ingested</span>
            </div>
          </div>
          <div className="h-px bg-white/5 w-full" />
          <div className="flex flex-col gap-1">
             <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Objects Synced</span>
              <span className="text-white/60">Calculated...</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
              <div className="w-3/4 h-full bg-primary rounded-full shadow-[0_0_10px_rgba(47,129,247,0.5)]" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Quick Launch</span>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all group">
              <Zap className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold">Build with AI</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all group">
              <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold">Open Org</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Placeholder */}
      <div className="flex-1 min-h-[400px] border border-dashed border-white/10 rounded-3xl flex items-center justify-center text-white/20 flex-col gap-4 bg-white/[0.01]">
        <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center">
          <Server className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">Select a module from the navbar to start forging</p>
      </div>
    </div>
  );
}
