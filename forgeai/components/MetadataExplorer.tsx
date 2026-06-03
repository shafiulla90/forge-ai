'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  RefreshCw, 
  Box, 
  Code2, 
  Workflow, 
  ShieldCheck, 
  FileText, 
  Layout, 
  ChevronRight, 
  ChevronDown,
  Database,
  ExternalLink,
  Download,
  Loader2,
  X,
  FileCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to debounce function calls
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = React.useRef<NodeJS.Timeout>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

export function MetadataExplorer() {
  const [org, setOrg] = useState<any>(null);
  const [metadataTypes, setMetadataTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('CustomObject');
  const [members, setMembers] = useState<any[]>([]);
  
  // Data for Grouped View
  const [objects, setObjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 1. Fetch Org & Core Types for Grouping
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const orgRes = await fetch('/api/orgs');
        const orgs = await orgRes.json();
        if (orgs && orgs.length > 0) {
          const activeOrg = orgs[0];
          setOrg(activeOrg);
          
          const typesRes = await fetch(`/api/metadata/types?orgId=${activeOrg.id}`);
          const typesData = await typesRes.json();
          setMetadataTypes(typesData.types || []);

          // Fetch initial groups for dynamic display
          const [objRes, classRes, flowRes] = await Promise.all([
            fetch(`/api/metadata/members?orgId=${activeOrg.id}&type=CustomObject`),
            fetch(`/api/metadata/members?orgId=${activeOrg.id}&type=ApexClass`),
            fetch(`/api/metadata/members?orgId=${activeOrg.id}&type=Flow`)
          ]);
          
          const [objData, classData, flowData] = await Promise.all([
            objRes.json(),
            classRes.json(),
            flowRes.json()
          ]);

          setObjects(objData.members || []);
          setClasses(classData.members || []);
          setFlows(flowData.members || []);
        }
      } catch (err) {
        console.error('Failed to init Metadata Explorer:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Fetch Members when Type changes (Sidebar)
  useEffect(() => {
    if (!org || !selectedType || searchQuery) return;
    
    async function fetchMembers() {
      try {
        setMembersLoading(true);
        const res = await fetch(`/api/metadata/members?orgId=${org.id}&type=${selectedType}`);
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err) {
        console.error('Failed to fetch members:', err);
      } finally {
        setMembersLoading(false);
      }
    }
    fetchMembers();
  }, [org, selectedType, searchQuery]);

  // 3. Search logic (debounced)
  const handleSearch = useDebounce(async (query: string) => {
    if (!query.trim() || !org) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const res = await fetch(`/api/metadata/search?orgId=${org.id}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleSelectItem = async (item: any) => {
    setSelectedItem(item);
    if (item.id || item.fullName) {
      try {
        setDetailsLoading(true);
        const type = item.type || selectedType;
        const res = await fetch(`/api/metadata/read?orgId=${org.id}&type=${type}&name=${item.fullName}`);
        const data = await res.json();
        setItemDetails(data.metadata);
      } catch (err) {
        console.error('Failed to fetch details:', err);
      } finally {
        setDetailsLoading(false);
      }
    } else {
      setItemDetails(null);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0a1628] text-[#e2e8f0] font-sans">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#021427] border-r border-[#1e3a52] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#1e3a52]">
          <div className="text-[14px] font-bold text-[#185FA5]">Forge</div>
          <div className="text-[9px] text-[#4a7fa5] mt-0.5">Forge AI Builder</div>
        </div>
        <div className="m-2 p-3 bg-[#031b2e] rounded-[10px] border border-[#1e3a52]">
          <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">
            {org?.alias || 'No Org Connected'}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", org ? "bg-[#22c55e]" : "bg-red-500")}></div>
            <span className="text-[9px] text-[#4a7fa5]">
              {org ? 'Synced' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="px-4 py-2 text-[9px] font-bold text-[#4a7fa5] tracking-widest uppercase mt-2 flex items-center gap-2">
          <Database className="w-3 h-3" /> FILTER BY TYPE
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#00A1E0]" />
            </div>
          ) : (
            metadataTypes.filter(t => ['CustomObject', 'ApexClass', 'ApexTrigger', 'Flow', 'PermissionSet', 'Layout', 'ValidationRule'].includes(t.xmlName)).map((item, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedType(item.xmlName)}
                className={cn(
                  "flex items-center justify-between px-4 py-2 text-[11px] cursor-pointer hover:bg-[#0d2137] transition-all",
                  selectedType === item.xmlName ? 'bg-[#0d2137] text-[#00A1E0] border-l-2 border-[#00A1E0]' : 'text-[#7CC4E4]'
                )}
              >
                <span className="truncate">{item.xmlName}</span>
                <ChevronRight className="w-3 h-3 opacity-20" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#050b16]">
        {/* Top bar */}
        <div className="h-[60px] bg-[#021427] border-b border-[#1e3a52] px-6 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <div className="text-[15px] font-bold text-white flex items-center gap-2">
              Metadata Explorer
              <span className="text-[10px] bg-[#00A1E0]/10 text-[#00A1E0] px-1.5 py-0.5 rounded border border-[#00A1E0]/20 font-mono">Live</span>
            </div>
            <div className="text-[10px] text-[#4a7fa5]">Synchronized with {org?.alias}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-[280px]">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d2137] border border-[#1e3a52] rounded-lg py-2 pl-9 pr-4 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00A1E0] transition-all shadow-inner" 
                placeholder="Search by name or type..."
              />
              <Search className="absolute left-2.5 top-2.5 text-[#4a7fa5] w-3 h-3" />
            </div>
            <button className="bg-[#00A1E0] hover:bg-[#0081B5] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Refresh org
            </button>
          </div>
        </div>

        {/* Scrollable Structured List */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="text-[12px] font-bold text-[#4a7fa5] mb-6 flex items-center gap-2 uppercase tracking-tight">
            All metadata 
            <span className="text-[10px] font-normal text-[#4a7fa5] ml-auto italic opacity-50">
              {objects.length + classes.length + flows.length}+ items · Acme Corp Production
            </span>
          </div>

          <div className="space-y-10">
            {/* Custom Objects Group */}
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black text-[#4a7fa5] uppercase tracking-[0.2em] mb-4">
                <Box className="w-3.5 h-3.5" /> Custom Objects
                <span className="text-[10px] font-mono ml-auto opacity-50">{objects.length}</span>
              </div>
              <div className="space-y-0.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto opacity-20" /> :
                 objects.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 px-4 rounded-lg hover:bg-[#0d2137] cursor-pointer text-[11.5px] transition-all group border border-transparent hover:border-white/5">
                    <input type="checkbox" className="w-3 h-3 rounded border-[#1e3a52] bg-transparent" />
                    <span className="font-medium text-[#e2e8f0] flex-1">{item.fullName}</span>
                    <span className="text-[9px] text-[#4a7fa5] uppercase font-bold tracking-tighter bg-[#031b2e] px-2 py-0.5 rounded border border-white/5">Object</span>
                  </div>
                ))}
                {objects.length > 10 && <div className="text-[10px] text-[#4a7fa5] px-4 py-2">... and {objects.length - 10} more</div>}
              </div>
            </div>

            {/* Apex Classes Group */}
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black text-[#4a7fa5] uppercase tracking-[0.2em] mb-4">
                <Code2 className="w-3.5 h-3.5" /> Apex Classes
                <span className="text-[10px] font-mono ml-auto opacity-50">{classes.length}</span>
              </div>
              <div className="space-y-0.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto opacity-20" /> :
                 classes.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 px-4 rounded-lg hover:bg-[#0d2137] cursor-pointer text-[11.5px] transition-all group border border-transparent hover:border-white/5">
                    <FileCode className="w-3.5 h-3.5 text-[#00A1E0] opacity-50" />
                    <span className="font-medium text-[#e2e8f0] flex-1">{item.fullName}</span>
                    <span className="text-[9px] text-[#4a7fa5] uppercase font-bold tracking-tighter bg-[#031b2e] px-2 py-0.5 rounded border border-white/5">Class</span>
                  </div>
                ))}
                {classes.length > 10 && <div className="text-[10px] text-[#4a7fa5] px-4 py-2">... and {classes.length - 10} more</div>}
              </div>
            </div>

            {/* Flows Group */}
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black text-[#4a7fa5] uppercase tracking-[0.2em] mb-4">
                <Workflow className="w-3.5 h-3.5" /> Flows
                <span className="text-[10px] font-mono ml-auto opacity-50">{flows.length}</span>
              </div>
              <div className="space-y-0.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto opacity-20" /> :
                 flows.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 px-4 rounded-lg hover:bg-[#0d2137] cursor-pointer text-[11.5px] transition-all group border border-transparent hover:border-white/5">
                    <Workflow className="w-3.5 h-3.5 text-[#a78bfa] opacity-50" />
                    <span className="font-medium text-[#e2e8f0] flex-1">{item.fullName}</span>
                    <span className="text-[9px] text-[#4a7fa5] uppercase font-bold tracking-tighter bg-[#031b2e] px-2 py-0.5 rounded border border-white/5">Flow</span>
                  </div>
                ))}
                {flows.length > 10 && <div className="text-[10px] text-[#4a7fa5] px-4 py-2">... and {flows.length - 10} more</div>}
              </div>
            </div>
          </div>
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
}
