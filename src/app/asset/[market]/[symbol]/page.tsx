"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Activity, Users, Settings, RefreshCw, BarChart2, Globe } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { adminFetch } from "@/lib/admin-api";
import { ref, onValue } from "firebase/database";
import { SymbolAvatar } from "@/components/SymbolAvatar";
import { getPrePostLabel } from "@/lib/market-utils";

type AssetDetail = {
  symbol: string;
  market: string;
  name: string;
  is_active: boolean;
  exchange: string;
  country: string;
  subscribers_count: number;
};

type FirebaseAssetData = {
  marketPrice: number;
  percentChange?: number;
  name: string;
  updatedAt?: string;
  extendedPrice?: number;
  extendedPercent?: number;
  isMarketOpen?: boolean;
};

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const market = params.market as string;
  const symbol = params.symbol as string;

  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [firebaseData, setFirebaseData] = useState<FirebaseAssetData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Mock Price state
  const [mockPrice, setMockPrice] = useState("");
  const [isSavingMock, setIsSavingMock] = useState(false);

  useEffect(() => {
    // 1. Fetch Backend Details
    const fetchBackendDetail = async () => {
      try {
        const res = await adminFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets/${market}/${symbol}`);
        if (!res.ok) {
          throw new Error("Asset not found or backend error");
        }
        const data = await res.json();
        setAssetDetail(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load asset details from backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchBackendDetail();

    // 2. Listen to Firebase Realtime Price
    const priceRef = ref(db, `price/${market}/${symbol}`);
    const unsubscribe = onValue(priceRef, (snapshot) => {
      if (snapshot.exists()) {
        setFirebaseData(snapshot.val());
      } else {
        setFirebaseData(null);
      }
    }, (error) => {
      console.error("Firebase DB Error: ", error);
    });

    return () => unsubscribe();
  }, [market, symbol]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/sync?symbol=${symbol}`;
      await adminFetch(url, { method: "POST" });
    } catch (err) {
      console.error("Failed to force sync", err);
      alert("Failed to force sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMockPriceSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mockPrice || isNaN(Number(mockPrice))) return;
    
    setIsSavingMock(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/mock-price/${market}/${symbol}`;
      await adminFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          marketPrice: Number(mockPrice),
          name: assetDetail?.name || symbol
        }),
      });
      setMockPrice("");
    } catch (err) {
      console.error("Failed to set mock price", err);
      alert("Failed to set mock price");
    } finally {
      setIsSavingMock(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-slate-950 text-slate-200 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  if (error || !assetDetail) {
    return (
      <main className="min-h-screen p-8 bg-slate-950 text-slate-200">
        <div className="max-w-4xl mx-auto text-center mt-20">
          <h2 className="text-2xl font-bold text-red-400 mb-4">{error || "Asset Not Found"}</h2>
          <Link href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const pctChange = firebaseData?.percentChange || 0;
  const isPositive = pctChange >= 0;
  
  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 bg-slate-950 text-slate-200">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Navigation */}
        <header className="mb-10">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer">
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SymbolAvatar symbol={symbol} size={64} />
              <div>
                <h1 className="text-4xl font-bold text-white mb-1 flex items-center gap-3">
                  {symbol}
                </h1>
                <p className="text-lg text-slate-400">{assetDetail.name}</p>
              </div>
            </div>
            
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${assetDetail.is_active ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                {assetDetail.is_active ? 'Active Tracking' : 'Inactive'}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Price Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Activity size={120} />
              </div>
              
              <h2 className="text-slate-400 font-semibold mb-6 flex items-center gap-2">
                <BarChart2 size={18} /> Real-time Firebase Data
              </h2>
              
              {firebaseData ? (
                <div>
                  <div className="flex items-end gap-4 mb-2">
                    <span className="text-5xl font-extrabold text-white">
                      ${firebaseData.marketPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </span>
                    <span className={`text-2xl font-semibold mb-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{pctChange.toFixed(2)}%
                    </span>
                  </div>
                  {firebaseData.extendedPrice ? (
                    (() => {
                      const prePost = getPrePostLabel(firebaseData.updatedAt);
                      return (
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`${prePost.colorClass} font-medium`}>{prePost.label}</span>
                          <span className="text-slate-200 font-bold">${firebaseData.extendedPrice.toLocaleString()}</span>
                          <span className={firebaseData.extendedPercent == 0 ? "text-gray-400 font-bold" : firebaseData.extendedPercent && firebaseData.extendedPercent >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                            {firebaseData.extendedPercent && firebaseData.extendedPercent > 0 ? "+" : ""}{firebaseData.extendedPercent?.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })()
                  ) : null}
                  <p className="text-slate-500 text-sm flex items-center gap-2 mt-4">
                    <RefreshCw size={14} /> Last updated: {firebaseData.updatedAt || 'Unknown'}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-500">No price data available in Firebase for this market/symbol.</p>
                </div>
              )}
            </div>

            {/* Reference Details */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
               <h3 className="text-slate-400 font-semibold mb-4 border-b border-slate-800 pb-2">Asset Information</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-sm text-slate-500 mb-1">Market Category</p>
                   <p className="text-white font-medium uppercase">{market}</p>
                 </div>
                 <div>
                   <p className="text-sm text-slate-500 mb-1">Exchange</p>
                   <p className="text-white font-medium">{assetDetail.exchange || '-'}</p>
                 </div>
                 <div>
                   <p className="text-sm text-slate-500 mb-1">Country</p>
                   <p className="text-white font-medium flex items-center gap-1">
                     <Globe size={14} className="text-slate-500" /> {assetDetail.country || '-'}
                   </p>
                 </div>
               </div>
            </div>

          </div>

          {/* Sidebar Tools Column */}
          <div className="space-y-6">
            
            {/* Stats Card */}
            <div className="bg-slate-900/80 border border-blue-900/30 rounded-2xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{assetDetail.subscribers_count}</p>
                  <p className="text-sm text-slate-400">Active Subscribers</p>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-slate-400 font-semibold mb-4 flex items-center gap-2">
                <Settings size={18} /> Actions
              </h3>
              
              <button 
                onClick={handleForceSync}
                disabled={isSyncing}
                className="w-full mb-6 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg font-medium transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Syncing with Provider..." : "Force Manual Sync"}
              </button>

              <div className="pt-6 border-t border-slate-800">
                <h4 className="text-sm text-slate-400 font-medium mb-3">Mock Price (Test overriding)</h4>
                <form onSubmit={handleMockPriceSubmit} className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={mockPrice}
                    onChange={(e) => setMockPrice(e.target.value)}
                    placeholder="E.g. 150.25"
                    className="flex-1 w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isSavingMock}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Set
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
