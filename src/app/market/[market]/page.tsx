"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { ArrowLeft, ArrowUpDown, Server, Search } from "lucide-react";
import Link from "next/link";
import { SymbolAvatar } from "@/components/SymbolAvatar";
import { getPrePostLabel } from "@/lib/market-utils";

type AssetData = {
  marketPrice: number;
  percentChange?: number;
  name: string;
  updatedAt?: string;
  extendedPrice?: number;
  extendedPercentChange?: number;
  isMarketOpen?: boolean;
};

type SortField = 'symbol' | 'price' | 'percent' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function MarketDetailPage(props: { params: Promise<{ market: string }> }) {
  const params = use(props.params);
  const market = params.market;
  const [data, setData] = useState<Record<string, AssetData>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const priceRef = ref(db, `price/${market}`);
    const unsubscribe = onValue(priceRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.val());
      } else {
        setData({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [market]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to desc when switching to numbers
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    return new Intl.DateTimeFormat("en-GB", { 
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(new Date(isoString));
  };

  const filteredAndSortedData = Object.entries(data)
    .filter(([symbol, assetData]) => 
      symbol.toLowerCase().includes(search.toLowerCase()) || 
      (assetData.name && assetData.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const [symA, dataA] = a;
      const [symB, dataB] = b;
      let cmp = 0;

      switch (sortField) {
        case 'symbol':
          cmp = symA.localeCompare(symB);
          break;
        case 'price':
          cmp = (dataA.marketPrice || 0) - (dataB.marketPrice || 0);
          break;
        case 'percent':
          cmp = (dataA.percentChange || 0) - (dataB.percentChange || 0);
          break;
        case 'updatedAt':
          const timeA = dataA.updatedAt ? new Date(dataA.updatedAt).getTime() : 0;
          const timeB = dataB.updatedAt ? new Date(dataB.updatedAt).getTime() : 0;
          cmp = timeA - timeB;
          break;
      }
      
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 relative overflow-hidden bg-slate-950">
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white capitalize flex items-center gap-3">
              <span className="bg-slate-800 p-2 rounded-lg text-blue-400"><Server size={32}/></span>
              {market} Market
            </h1>
            <p className="text-slate-400 mt-2">Viewing all active assets in {market}.</p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search symbol or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700">
                    <th 
                      className="p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('symbol')}
                    >
                      <div className="flex items-center gap-2">Asset <ArrowUpDown size={14} className="text-slate-500"/></div>
                    </th>
                    <th 
                      className="p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors text-right"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-2">Price <ArrowUpDown size={14} className="text-slate-500"/></div>
                    </th>
                    {market === 'usa' && (
                      <th className="p-4 text-sm font-semibold text-slate-300 text-right">Pre/Post Market</th>
                    )}
                    <th 
                      className="p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors text-right"
                      onClick={() => handleSort('percent')}
                    >
                      <div className="flex items-center justify-end gap-2">% Change <ArrowUpDown size={14} className="text-slate-500"/></div>
                    </th>
                    <th 
                      className="p-4 text-sm font-semibold text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors text-right"
                      onClick={() => handleSort('updatedAt')}
                    >
                      <div className="flex items-center justify-end gap-2">Last Updated <ArrowUpDown size={14} className="text-slate-500"/></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredAndSortedData.map(([symbol, assetData]) => {
                    const pctChange = assetData.percentChange || 0;
                    
                    return (
                      <tr key={symbol} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <SymbolAvatar symbol={symbol} size={36} />
                            <div>
                              <div className="font-bold text-white text-lg">{symbol}</div>
                              <div className="text-xs text-slate-400">{assetData.name || "Unknown"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-mono text-lg text-slate-200">${assetData.marketPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) || "0.00"}</div>
                        </td>
                        
                        {market === 'usa' && (
                          <td className="p-4 text-right">
                            {assetData.extendedPrice ? (
                              (() => {
                                const prePost = getPrePostLabel(assetData.updatedAt);
                                return (
                                  <div>
                                    <div className={`text-xs ${prePost.colorClass} font-medium mb-0.5`}>{prePost.label}</div>
                                    <div className="font-mono text-sm text-slate-300">${assetData.extendedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <div className={`text-xs ${assetData.extendedPercentChange && assetData.extendedPercentChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {assetData.extendedPercentChange && assetData.extendedPercentChange > 0 ? "+" : ""}{assetData.extendedPercentChange?.toFixed(2)}%
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-slate-600 text-sm">-</span>
                            )}
                          </td>
                        )}

                        <td className="p-4 text-right">
                          <div className={`inline-block px-2 py-1 rounded font-bold text-sm ${pctChange > 0 ? 'bg-emerald-500/20 text-emerald-400' : pctChange < 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                            {pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-4 text-right text-sm text-slate-500 font-mono">
                          {formatTime(assetData.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredAndSortedData.length === 0 && (
                    <tr>
                      <td colSpan={market === 'usa' ? 5 : 4} className="p-8 text-center text-slate-400">
                        No assets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
