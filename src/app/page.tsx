"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Activity, DollarSign, Server, Clock, Settings, RefreshCw, Power, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

type AssetData = {
  marketPrice: number;
  name: string;
  updatedAt?: string;
};

type MarketData = Record<string, AssetData>;
type PriceFeedData = Record<string, MarketData>;

function PriceDisplay({ 
  price, 
  symbol, 
  isManualMode,
  onSave
}: { 
  price: number; 
  symbol: string;
  isManualMode: boolean;
  onSave: (p: number) => void;
}) {
  const prevPriceRef = useRef<number>(price);
  const [flashClass, setFlashClass] = useState("text-slate-300");
  const [inputValue, setInputValue] = useState(price.toString());
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    if (price > prevPriceRef.current) {
      setFlashClass("price-flash-up");
    } else if (price < prevPriceRef.current) {
      setFlashClass("price-flash-down");
    }
    prevPriceRef.current = price;
    if (!isFocused) {
      setInputValue(price.toString());
    }
  }, [price, isFocused]);

  if (isManualMode) {
    return (
      <input 
        type="number"
        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-2xl font-bold text-emerald-400 w-40 outline-none focus:border-blue-500 transition-colors"
        value={inputValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          setInputValue(price.toString());
        }}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const num = parseFloat(inputValue);
            if (!isNaN(num)) {
              onSave(num);
              e.currentTarget.blur();
            }
          }
        }}
        title="Press Enter to save manual price"
      />
    );
  }

  return (
    <span 
      key={`${symbol}-${price}`}
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
  const [data, setData] = useState<PriceFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [syncInterval, setSyncInterval] = useState<number>(60);
  const [isUpdatingSync, setIsUpdatingSync] = useState(false);
  
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Toggles State
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    sync_toggle_global: true
  });

  const loadToggles = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/settings/sync-toggles");
      if (res.ok) {
        setBackendConnected(true);
        const resData = await res.json();
        setToggles(resData);
      } else {
        setBackendConnected(false);
      }
    } catch (err) {
      setBackendConnected(false);
      console.error("Failed to load toggles", err);
    }
  };

  useEffect(() => {
    loadToggles();
    
    // Poll backend connection every 10 seconds
    const interval = setInterval(() => {
      loadToggles();
    }, 10000);

    fetch("http://localhost:8080/api/settings/sync-interval")
      .then(res => res.json())
      .then(resData => {
        if(resData.interval_minutes) setSyncInterval(parseInt(resData.interval_minutes));
      })
      .catch(err => console.error("Failed to load sync interval", err));

    // Firebase connection status
    const connectedRef = ref(db, ".info/connected");
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        setFirebaseConnected(true);
      } else {
        setFirebaseConnected(false);
      }
    });

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

    return () => {
      unsubscribe();
      unsubConnected();
      clearInterval(interval);
    };
  }, []);

  const handleUpdateSyncInterval = async (minutes: number) => {
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

  const toggleSync = async (key: string, value: boolean) => {
    try {
      await fetch("http://localhost:8080/api/settings/sync-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setToggles(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error("Failed to toggle sync", error);
    }
  };

  const forceSync = async (type?: string, symbol?: string) => {
    let url = "http://localhost:8080/api/sync";
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (symbol) params.append("symbol", symbol);
    if (params.toString()) url += "?" + params.toString();

    try {
      await fetch(url, { method: "POST" });
    } catch (error) {
      console.error("Failed to force sync", error);
    }
  };

  const handleManualSave = async (market: string, symbol: string, price: number) => {
    try {
      await fetch(`http://localhost:8080/api/mock-price/${market}/${symbol}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });
    } catch (error) {
      console.error("Failed to save manual price", error);
    }
  };

  const isGlobalSyncOn = toggles["sync_toggle_global"] !== false;

  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 relative overflow-hidden bg-slate-950">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-3">
              <Activity className="w-10 h-10 text-blue-400" />
              Live Price Monitor
            </h1>
            <div className="flex items-center gap-4 text-sm mt-3">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${firebaseConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {firebaseConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                Firebase: {firebaseConnected ? "Connected" : "Disconnected"}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${backendConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {backendConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                Backend: {backendConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => toggleSync("sync_toggle_global", !isGlobalSyncOn)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors border cursor-pointer ${
                isGlobalSyncOn 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              <Power size={16} />
              {isGlobalSyncOn ? "Auto-Sync: ON" : "Auto-Sync: OFF"}
            </button>
            
            <button
              onClick={() => forceSync()}
              className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-600/20 hover:text-blue-400 transition-colors text-slate-300 text-sm font-medium cursor-pointer"
              title="Force fetch all active assets"
            >
              <RefreshCw size={16} />
              Sync All
            </button>

            <Link 
              href="/assets" 
              className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-800/80 transition-colors text-slate-300 text-sm font-medium"
            >
              <Settings size={16} className="text-slate-400" />
              Manage
            </Link>

            <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-sm text-slate-400">Interval:</span>
              <select 
                value={syncInterval} 
                onChange={(e) => handleUpdateSyncInterval(parseInt(e.target.value))}
                disabled={isUpdatingSync}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-1.5 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value={1}>1 min</option>
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={60}>1 hour</option>
              </select>
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
            {Object.entries(data).map(([market, assets]) => {
              const catKey = `sync_toggle_${market}`;
              const isCategorySyncOn = toggles[catKey] !== false;
              const isManualMode = !isGlobalSyncOn || !isCategorySyncOn;

              return (
                <div key={market} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-700/50 pb-4">
                    <div className="flex flex-wrap items-center gap-4 mb-2 md:mb-0">
                      <h2 className="text-2xl font-bold text-slate-200 capitalize flex items-center gap-2">
                        <span className="bg-slate-800 p-2 rounded-lg text-blue-400"><Server size={20}/></span>
                        {market} Market
                      </h2>
                      
                      <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                        <button
                          onClick={() => toggleSync(catKey, !isCategorySyncOn)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                            isCategorySyncOn
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {isCategorySyncOn ? "Sync ON" : "Sync OFF"}
                        </button>
                        <button
                          onClick={() => forceSync(market)}
                          className="p-1.5 rounded hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                          title={`Force sync all ${market}`}
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                      <Clock size={14} className="text-blue-400" />
                      <span>Last Updated: <span className="text-slate-300">{getMarketLastUpdate(assets)}</span></span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.entries(assets).map(([symbol, assetData]) => (
                      <div 
                        key={symbol} 
                        className={`glass-panel rounded-2xl p-6 transition-all duration-300 border border-slate-700/50 hover:border-slate-600 bg-slate-800/30 group ${isManualMode ? 'ring-1 ring-emerald-500/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{market}</p>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-white">{symbol}</h3>
                              <button
                                onClick={() => forceSync(undefined, symbol)}
                                className="p-1.5 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500/20 hover:text-blue-400 cursor-pointer"
                                title={`Force sync ${symbol}`}
                              >
                                <RefreshCw size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-lg">
                            <DollarSign className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-slate-400 text-sm mb-2">{assetData.name || "Unknown Asset"}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl text-slate-500">$</span>
                            <PriceDisplay 
                              price={assetData.marketPrice} 
                              symbol={symbol}
                              isManualMode={isManualMode}
                              onSave={(newPrice) => handleManualSave(market, symbol, newPrice)}
                            />
                          </div>
                          
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock size={12} />
                            {assetData.updatedAt ? new Intl.DateTimeFormat("en-GB", { 
                                day: "2-digit", month: "short",
                                hour: "2-digit", minute: "2-digit", second: "2-digit"
                              }).format(new Date(assetData.updatedAt)) : "Unknown time"}
                          </div>
                          {isManualMode && (
                            <p className="text-xs text-emerald-500/70 mt-2 font-medium">✏️ Manual mode active. Press Enter to save.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
