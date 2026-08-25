"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Activity, DollarSign, Server, Clock, Settings } from "lucide-react";
import Link from "next/link";

type AssetData = {
  marketPrice: number;
  name: string;
  updatedAt?: string;
};

type MarketData = Record<string, AssetData>;
type PriceFeedData = Record<string, MarketData>;

// Component สำหรับแสดงราคาโดยเฉพาะ เพื่อให้จัดการ Animation ได้แม่นยำ
function PriceTicker({ price, symbol }: { price: number; symbol: string }) {
  const prevPriceRef = useRef<number>(price);
  const [flashClass, setFlashClass] = useState("text-slate-300");
  
  useEffect(() => {
    if (price > prevPriceRef.current) {
      setFlashClass("price-flash-up");
    } else if (price < prevPriceRef.current) {
      setFlashClass("price-flash-down");
    }
    prevPriceRef.current = price;
  }, [price]);

  return (
    <span 
      key={`${symbol}-${price}`} // บังคับให้ React สร้าง Element ใหม่เมื่อราคาเปลี่ยน เพื่อให้ Animation ทำงานซ้ำได้
      className={`text-4xl font-extrabold tracking-tight inline-block ${flashClass}`}
    >
      {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
    </span>
  );
}


const getMarketLastUpdate = (assets: MarketData) => {
  let latest = 0;
  Object.values(assets).forEach(a => {
    if (a.updatedAt) {
      const time = new Date(a.updatedAt).getTime();
      if (time > latest) latest = time;
    }
  });
  if (latest === 0) return "N/A";
  
  return new Intl.DateTimeFormat("en-GB", { 
    day: "2-digit", month: "short", year: "numeric", 
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(new Date(latest));
};
export default function Dashboard() {

  const handleUpdateSync = async (minutes: number) => {
    setIsUpdatingSync(true);
    try {
      await fetch("http://localhost:8080/api/settings/sync-interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval_minutes: minutes }),
      });
      setSyncInterval(minutes);
    } catch (error) {
      console.error("Failed to update sync interval", error);
    }
    setIsUpdatingSync(false);
  };

  const [data, setData] = useState<PriceFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncInterval, setSyncInterval] = useState<number>(60);
  const [isUpdatingSync, setIsUpdatingSync] = useState(false);

  useEffect(() => {
    const priceRef = ref(db, "price");
    const unsubscribe = onValue(priceRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.val());
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase DB Error: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch("http://localhost:8080/api/settings/sync-interval")
      .then(res => res.json())
      .then(resData => {
        if(resData.interval_minutes) {
          setSyncInterval(parseInt(resData.interval_minutes));
        }
      })
      .catch(err => console.error("Failed to load sync interval", err));
  }, []);


  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 relative overflow-hidden bg-slate-950">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-3">
              <Activity className="w-10 h-10 text-blue-400" />
              Live Price Monitor
            </h1>
            <p className="text-slate-400 text-lg">Real-time asset price tracking dashboard</p>
          </div>

          <div className="flex gap-4 items-center">
            <Link 
              href="/assets" 
              className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-800/80 transition-colors text-slate-300 text-sm font-medium"
            >
              <Settings size={16} className="text-slate-400" />
              Manage Assets
            </Link>
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-sm text-slate-400">Sync Data:</span>
              <select 
                value={syncInterval} 
                onChange={(e) => handleUpdateSync(parseInt(e.target.value))}
                disabled={isUpdatingSync}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-1.5 focus:ring-blue-500 outline-none"
              >
                <option value={1}>Every 1 min</option>
                <option value={15}>Every 15 mins</option>
                <option value={30}>Every 30 mins</option>
                <option value={60}>Every 1 hour</option>
                <option value={1440}>Every 24 hours</option>
              </select>
            </div>
            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm font-medium text-slate-300">Firebase Live</span>
            </div>
          </div>

        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        ) : !data ? (
          <div className="glass-panel p-12 text-center rounded-2xl">
            <h3 className="text-xl font-medium text-slate-300">No price data available</h3>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(data).map(([market, assets]) => (
              <div key={market} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-700/50 pb-2">
                  <h2 className="text-2xl font-bold text-slate-200 capitalize flex items-center gap-2 mb-2 md:mb-0">
                    <span className="bg-slate-800 p-2 rounded-lg text-blue-400"><Server size={20}/></span>
                    {market} Market
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                    <Clock size={14} className="text-blue-400" />
                    <span>Last Updated: <span className="text-slate-300">{getMarketLastUpdate(assets)}</span></span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Object.entries(assets).map(([symbol, assetData]) => (
                    <div 
                      key={symbol} 
                      className="glass-panel rounded-2xl p-6 transition-all duration-300 border border-slate-700/50 hover:border-slate-600 bg-slate-800/30"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{market}</p>
                          <h3 className="text-xl font-bold text-white">{symbol}</h3>
                        </div>
                        <div className="bg-slate-800/80 p-2 rounded-lg">
                          <DollarSign className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-slate-400 text-sm mb-1">{assetData.name || "Unknown Asset"}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl text-slate-500">$</span>
                          <PriceTicker price={assetData.marketPrice} symbol={symbol} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
