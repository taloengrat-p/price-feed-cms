"use client";

import { useEffect, useState } from "react";
import { Users, Search, Filter } from "lucide-react";

interface SubscriptionStat {
  symbol: string;
  market: string;
  count: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SubscriptionsPage() {
  const [stats, setStats] = useState<SubscriptionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketFilter, setMarketFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/api/subscriptions/stats`);
      if (marketFilter !== "all") {
        url.searchParams.append("market", marketFilter);
      }
      if (searchQuery) {
        url.searchParams.append("search", searchQuery);
      }

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        console.log("Subscriptions API Response:", json);
        setStats(json.data || []);
      } else {
        console.error("API Error Response:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch subscription stats:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStats();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [marketFilter, searchQuery]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-blue-500 w-8 h-8" /> User Subscriptions
          </h1>
          <p className="text-slate-400 mt-2">
            Track how many users have added each asset to their portfolio.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="text-slate-400 w-4 h-4" />
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-w-[150px]"
            >
              <option value="all">All Markets</option>
              <option value="usa">USA Stocks</option>
              <option value="th">Thai Stocks</option>
              <option value="crypto">Crypto</option>
              <option value="gold">Gold</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-sm">
                <th className="p-4 font-semibold uppercase tracking-wider">Symbol</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-center">Market</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-right">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    <div className="animate-pulse flex justify-center items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animation-delay-200"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animation-delay-400"></div>
                      <span className="ml-2">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : stats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-500">
                    No subscriptions found matching your criteria.
                  </td>
                </tr>
              ) : (
                stats.map((stat, i) => (
                  <tr
                    key={`${stat.market}-${stat.symbol}`}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-bold text-white text-lg">{stat.symbol}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-slate-800 text-blue-400 rounded-full text-xs font-semibold uppercase tracking-wider border border-slate-700">
                        {stat.market}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2 text-xl font-medium text-emerald-400">
                        {stat.count} <Users className="w-4 h-4 opacity-70" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
