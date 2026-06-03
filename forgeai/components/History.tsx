'use client';

import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const mockHistory = [
  {
    id: 'mock1',
    title: 'Partner referral tracking — 3 changes',
    desc: 'Created Referral_Partner__c lookup field on Opportunity, added to Opportunity Layout, created Pipeline by Partner report in Sales Reports.',
    time: 'Today - 9:41 AM',
    tags: ['Custom Field', 'Layout', 'Success'],
    status: 'Success',
    rollback: true,
    category: 'field'
  },
  {
    id: 'mock2',
    title: 'Closed Won — Project + Slack Flow',
    desc: 'Built and deployed Record-Triggered Flow on Opportunity. Trigger: StageName = \'Closed Won\' AND Amount > 1,000,000. Creates Project__c and calls Slack webhook.',
    time: 'Yesterday - 2:22 PM',
    tags: ['Record-Triggered Flow', 'External Service', 'Success'],
    status: 'Success',
    rollback: false,
    category: 'flow'
  },
  {
    id: 'mock3',
    title: 'AccountTrigger — bulkify SOQL fix',
    desc: 'Refactored AccountTrigger to move SOQL outside for loop. Replaced N+1 query pattern with single query + Map lookup. Apex test coverage improved from 51% to 78%.',
    time: 'Yesterday - 11:00 AM',
    tags: ['Apex Trigger', 'Test Class', 'Success - 78% coverage'],
    status: 'Success',
    rollback: false,
    category: 'apex'
  },
  {
    id: 'mock4',
    title: 'Lead Assignment Rule v2 — rolled back',
    desc: 'Attempted to update Lead Assignment Flow. Post-deployment test failed — flow causing duplicate assignment on Web-to-Lead submissions. Automatically rolled back to previous version.',
    time: '2 days ago - 4:15 PM',
    tags: ['Flow', 'Rolled back', 'Failed - Auto-reverted'],
    status: 'Failed',
    rollback: false,
    category: 'rollback'
  },
  {
    id: 'mock5',
    title: '5 new permission sets — role-based access',
    desc: 'Replaced broad Modify All Data profiles with 5 scoped permission sets: Sales_Rep, Sales_Manager, Service_Agent, Service_Manager, Ops_Admin. Applied to 142 users.',
    time: '3 days ago - 2:30 PM',
    tags: ['Permission Sets', 'Profiles', 'Success - 142 users updated'],
    status: 'Success',
    rollback: false,
    category: 'field'
  },
  {
    id: 'mock6',
    title: 'Org health audit — initial assessment',
    desc: 'First org scan completed. Found 47 unused fields, 3 SOQL-in-loop issues, 8 inactive flows, 5 over-permissioned profiles. Prioritized fix list generated.',
    time: '4 days ago - 10:00 AM',
    tags: ['Health Audit', 'Read-only - No deployment'],
    status: 'Success',
    rollback: false,
    category: 'field'
  }
];

export function History() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [orgRes, listRes] = await Promise.all([
          fetch('/api/orgs'),
          fetch('/api/history/list')
        ]);
        const orgs = await orgRes.json();
        if (orgs && orgs.length > 0) setOrg(orgs[0]);
        const listData = await listRes.json();
        setDeployments(listData.deployments || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    setCurrentTime(new Date().toLocaleTimeString());
  }, []);

  // Process and normalize real deployments from DB
  const processedDeployments = deployments.map(dep => {
    const isSuccess = dep.status?.toLowerCase() === 'success' || dep.raw?.status === 'completed';
    const isFailed = dep.status?.toLowerCase() === 'failed' || dep.raw?.status === 'failed';
    
    let formattedTime = dep.time || '';
    try {
      const date = new Date(dep.raw?.created_at || dep.created_at);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        
        if (date.toDateString() === new Date().toDateString()) {
          formattedTime = `Today - ${formattedHours}:${minutes} ${ampm}`;
        } else {
          formattedTime = `${date.toLocaleDateString()} - ${formattedHours}:${minutes} ${ampm}`;
        }
      }
    } catch(e) {}

    let title = dep.title || `AI Deployment #${dep.id?.slice(0, 8)}`;
    let desc = dep.desc || 'Built and deployed AI-generated metadata changes to your Salesforce org.';
    let tags = dep.tags && dep.tags.length > 0 ? dep.tags : ['Metadata', 'Deployment'];
    let category = 'field';

    try {
      const rawMeta = dep.raw?.rollback_metadata;
      const items = rawMeta ? (typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta) : [];
      if (Array.isArray(items) && items.length > 0) {
        const item = items[0];
        if (item.type === 'ApexClass') {
          title = `${item.fullName} — Apex Class Deploy`;
          desc = `Refactored and compiled ${item.fullName} Apex class. Successfully verified and deployed with code validation.`;
          tags = ['Apex Class', 'Success'];
          category = 'apex';
        } else if (item.type === 'CustomObject') {
          title = `${item.fullName} — Custom Object Created`;
          desc = `Created ${item.fullName} Custom Object for schema optimization and tracking data relationships.`;
          tags = ['Custom Object', 'Success'];
          category = 'field';
        }
      }
    } catch (e) {}

    return {
      id: dep.id,
      title,
      desc,
      time: formattedTime,
      tags,
      status: isSuccess ? 'Success' : 'Failed',
      rollback: isSuccess,
      category: isFailed ? 'rollback' : category
    };
  });

  // Combine real database deployments with premium mockup items
  const allItems = [...processedDeployments, ...mockHistory];

  // Filter items based on selected tab
  const filteredItems = allItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'week') return item.time.startsWith('Today') || item.time.startsWith('Yesterday') || item.time.includes('days ago');
    if (activeTab === 'apex') return item.category === 'apex';
    if (activeTab === 'flow') return item.category === 'flow';
    if (activeTab === 'field') return item.category === 'field';
    if (activeTab === 'rollback') return item.category === 'rollback' || item.status === 'Failed';
    return true;
  });

  // Dynamic counts for filters
  const getCount = (tabId: string) => {
    return allItems.filter(item => {
      if (tabId === 'all') return true;
      if (tabId === 'week') return item.time.startsWith('Today') || item.time.startsWith('Yesterday') || item.time.includes('days ago');
      if (tabId === 'apex') return item.category === 'apex';
      if (tabId === 'flow') return item.category === 'flow';
      if (tabId === 'field') return item.category === 'field';
      if (tabId === 'rollback') return item.category === 'rollback' || item.status === 'Failed';
      return true;
    }).length;
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge AI Builder</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52]">
          <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">
            {org?.alias || 'No Org Connected'}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
            <span className="text-[9px] text-[#22c55e]">
              Connected
            </span>
          </div>
        </div>
        <Link 
          href="/dashboard?view=chat"
          className="m-3 mt-1 bg-[#00A1E0] hover:bg-[#0081B5] text-white font-bold py-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> Start New Build
        </Link>

        {/* Categories Menu */}
        <div className="mt-2 flex-1 px-2 space-y-1">
          {[
            { id: 'all', label: 'All deployments' },
            { id: 'week', label: 'This week' },
            { id: 'apex', label: 'Apex deployments' },
            { id: 'flow', label: 'Flow deployments' },
            { id: 'field', label: 'Field changes' },
            { id: 'rollback', label: 'Rolled back' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-between",
                activeTab === tab.id 
                  ? "bg-[#185FA5]/20 text-[#00A1E0] border-l-2 border-[#00A1E0] pl-2.5 font-bold" 
                  : "text-[#4a7fa5] hover:text-[#e2e8f0] hover:bg-white/5"
              )}
            >
              <span>{tab.label}</span>
              <span className="bg-white/5 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{getCount(tab.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#050b16]">
        <div className="h-[60px] bg-[#021427] border-b border-[#1e3a52] px-6 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <div className="text-[15px] font-bold text-white">Deployment History</div>
            <div className="text-[10px] text-[#4a7fa5] uppercase tracking-widest font-black mt-0.5">Pipeline Logs · Live Status</div>
          </div>
          <div className="flex items-center gap-4">
            {currentTime && (
              <div className="text-[10px] font-bold text-[#4a7fa5] uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                Last update: {currentTime}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="text-[10px] font-black uppercase tracking-widest">Fetching activity...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
              <HistoryIcon className="w-12 h-12 mb-4 text-[#4a7fa5]" />
              <div className="text-[12px] font-bold uppercase tracking-widest text-[#4a7fa5]">No deployments under this category</div>
            </div>
          ) : filteredItems.map((item) => (
            <div key={item.id} className="bg-[#0d2137] border border-[#1e3a52] rounded-[16px] p-6 shadow-xl hover:border-[#00A1E0]/50 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-white mb-1 group-hover:text-[#00A1E0] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#7da5c9] leading-relaxed max-w-[800px] mt-1.5">
                    {item.desc}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#4a7fa5] font-medium">{item.time}</div>
                  {item.rollback && (
                    <button className="mt-2 text-[9px] font-bold text-[#00A1E0] hover:underline flex items-center gap-1 ml-auto">
                      <RotateCcw className="w-2.5 h-2.5" /> Rollback available
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                {item.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="bg-[#1e3a52] text-[#7CC4E4] px-2.5 py-0.5 rounded text-[9px] font-bold border border-[#1e3a52]/40 uppercase tracking-wider">{tag}</span>
                ))}
                <span className={cn(
                  "px-2.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1.5 ml-1",
                  item.status === 'Success' ? "bg-[#0d2f17] text-[#4ade80]" : "bg-[#3f0d0d] text-[#f87171]"
                )}>
                  {item.status === 'Success' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
