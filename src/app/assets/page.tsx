"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Activity, ArrowLeft, ChevronLeft, ChevronRight, CheckSquare, Square, RefreshCw, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SymbolAvatar } from "@/components/SymbolAvatar";

type Asset = {
  id?: number;
  symbol: string;
  name: string;
  type: string;
  price: number;
};

type ReferenceAsset = {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  country: string;
};

const MARKET_TABS = [
  { id: "usa", name: "USA Stocks" },
  { id: "th", name: "Thai Stocks" },
  { id: "crypto", name: "Crypto" },
  { id: "gold", name: "Forex & Gold" },
  { id: "etf", name: "ETF" },
  { id: "mutual_fund", name: "Mutual Fund" }
];

export default function AssetsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("usa");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trackedAssets, setTrackedAssets] = useState<Asset[]>([]);
  
  const [refAssets, setRefAssets] = useState<ReferenceAsset[]>([]);
  const [totalRefAssets, setTotalRefAssets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [syncStatuses, setSyncStatuses] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Load tracked assets
  const fetchTrackedAssets = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets`);
      const data = await res.json();
      setTrackedAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch tracked assets", error);
    }
  };

  // Load reference assets with pagination and search
  const fetchRefAssets = async (page: number, query: string, market: string, status: string) => {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reference-assets?type=${market}&page=${page}&limit=${limit}&q=${encodeURIComponent(query)}&status=${status}`;
      const res = await fetch(url);
      const result = await res.json();
      
      // Handle the new paginated API format
      if (result.data) {
        setRefAssets(result.data || []);
        setTotalRefAssets(result.total || 0);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.page || 1);
      } else {
        // Fallback if API hasn't been updated yet or returned an array directly
        setRefAssets(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      console.error("Failed to fetch reference assets", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatuses = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sync-reference-status`);
      if (res.ok) {
        const data = await res.json();
        setSyncStatuses(data);
      }
    } catch (error) {
      console.error("Failed to fetch sync status", error);
    }
  };

  useEffect(() => {
    fetchTrackedAssets();
    fetchSyncStatuses();
  }, []);

  useEffect(() => {
    fetchRefAssets(currentPage, search, activeTab, statusFilter);
  }, [currentPage, activeTab, statusFilter]);

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on new search
      fetchRefAssets(1, val, activeTab, statusFilter);
    }, 500);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearch("");
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Handle Sync Trigger
  const handleSyncMarket = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sync-reference?type=${activeTab}`, {
        method: "POST"
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setSyncError(data.error || "Failed to sync reference data.");
      } else {
        setSyncSuccess(`Successfully synced ${data.count} items.`);
        await fetchSyncStatuses(); // refresh the time
        fetchRefAssets(1, search, activeTab, statusFilter);
        setCurrentPage(1);
      }
    } catch (error) {
      setSyncError("Network error while syncing data.");
    } finally {
      setIsSyncing(false);
      
      // Auto-hide messages after 5 seconds
      setTimeout(() => {
        setSyncError(null);
        setSyncSuccess(null);
      }, 5000);
    }
  };

  // Toggle Tracking Status
  const toggleTracking = async (refAsset: ReferenceAsset) => {
    const existingAsset = trackedAssets.find(a => a.symbol === refAsset.symbol);
    
    if (existingAsset) {
      // Remove it
      if (!existingAsset.id) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets/${existingAsset.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setTrackedAssets(prev => prev.filter(a => a.id !== existingAsset.id));
        }
      } catch (error) {
        console.error("Failed to remove asset", error);
      }
    } else {
      // Add it
      const mappedType = activeTab === "crypto" ? "crypto" : activeTab === "gold" ? "gold" : activeTab === "th" ? "th" : activeTab === "etf" ? "etf" : activeTab === "mutual_fund" ? "mutual_fund" : "usa";
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: refAsset.symbol,
            name: refAsset.name,
            type: mappedType,
            price: 0
          }),
        });
        
        if (res.ok) {
          const newAsset = await res.json();
          setTrackedAssets(prev => [...prev, newAsset]);
        }
      } catch (error) {
        console.error("Failed to add asset", error);
      }
    }
  };

  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 bg-slate-950 text-slate-200">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="text-blue-500" size={36} /> 
            Management Assets
          </h1>
          <p className="text-slate-400">Select which market assets you want to track on your dashboard.</p>
        </header>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl mb-6 overflow-x-auto">
          {MARKET_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${MARKET_TABS.find(t => t.id === activeTab)?.name} symbols...`}
              value={search}
              onChange={handleSearchChange}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={handleStatusChange}
            className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="tracked">Added</option>
            <option value="untracked">Not Added</option>
          </select>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncMarket}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing..." : `Sync ${MARKET_TABS.find(t => t.id === activeTab)?.name} Data`}
            </button>
            <span className="text-sm text-slate-400">
              Last synced: {syncStatuses[activeTab] ? new Intl.DateTimeFormat("en-US", { 
                year: "numeric", month: "short", day: "numeric", 
                hour: "2-digit", minute: "2-digit", second: "2-digit"
              }).format(new Date(syncStatuses[activeTab])) : "Not synced yet"}
            </span>
          </div>
          
          {(syncError || syncSuccess) && (
            <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${
              syncError ? "bg-red-900/30 text-red-400 border border-red-800" : "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
            }`}>
              {syncError && <AlertCircle size={16} />}
              <span>{syncError || syncSuccess}</span>
            </div>
          )}
        </div>

        {/* Table Area */}
        <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 overflow-hidden">
          {loading && refAssets.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-700/50">
                      <th className="p-4 w-16 text-center text-sm font-semibold text-slate-300">Track</th>
                      <th className="p-4 text-sm font-semibold text-slate-300">Symbol</th>
                      <th className="p-4 text-sm font-semibold text-slate-300">Name</th>
                      <th className="p-4 text-sm font-semibold text-slate-300">Exchange</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {refAssets.map((refAsset) => {
                      const isTracked = trackedAssets.some(a => a.symbol === refAsset.symbol);
                      
                      return (
                        <tr 
                          key={refAsset.symbol} 
                          className={`transition-colors cursor-pointer group ${isTracked ? 'bg-blue-900/10 hover:bg-blue-900/20' : 'hover:bg-slate-800/50'}`}
                          onClick={() => router.push(`/asset/${activeTab}/${refAsset.symbol}`)}
                        >
                          <td className="p-4 text-center" onClick={(e) => { e.stopPropagation(); toggleTracking(refAsset); }}>
                            <div className="flex justify-center items-center h-full w-full">
                              {isTracked ? (
                                <CheckSquare className="text-blue-500 cursor-pointer" size={20} />
                              ) : (
                                <Square className="text-slate-500 cursor-pointer hover:text-slate-300" size={20} />
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <SymbolAvatar symbol={refAsset.symbol} size={32} />
                              <div className="font-bold text-white text-base">{refAsset.symbol}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-slate-300">{refAsset.name}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-mono text-slate-500 bg-slate-800/50 inline-block px-2 py-1 rounded">
                              {refAsset.exchange || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {refAssets.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          No assets found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-t border-slate-700/50">
                  <div className="text-sm text-slate-400">
                    Showing <span className="font-medium text-white">{refAssets.length}</span> of <span className="font-medium text-white">{totalRefAssets}</span> results
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex items-center px-4 rounded-lg bg-slate-800 text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
