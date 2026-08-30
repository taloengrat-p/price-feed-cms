"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Activity, DollarSign, Server, Clock, Settings, RefreshCw, Power, Wifi, WifiOff, ArrowRight } from "lucide-react";
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

type MarketData = Record<string, AssetData>;
type PriceFeedData = Record<string, MarketData>;

function PriceDisplay({ 
  price = 0, 
  symbol, 
  isManualMode,
  onSave
}: { 
  price?: number; 
  symbol: string;
  isManualMode: boolean;
  onSave: (p: number) => void;
}) {
  const prevPriceRef = useRef<number>(price);
  const [displayPrice, setDisplayPrice] = useState(price);
  const [flashClass, setFlashClass] = useState("text-slate-300");
  const [inputValue, setInputValue] = useState(price.toString());
  const [isFocused, setIsFocused] = useState(false);
  
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (price === prevPriceRef.current) return;

    if (price > prevPriceRef.current) {
      setFlashClass("price-flash-up");
    } else {
      setFlashClass("price-flash-down");
    }

    const startPrice = prevPriceRef.current;
    const endPrice = price;
    const duration = 800; // 800ms animation
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      
      // easeOutExpo easing function for natural slow-down at the end
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = startPrice + (endPrice - startPrice) * easeProgress;
      setDisplayPrice(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPrice(endPrice);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);

    prevPriceRef.current = price;

    // Reset flash class after 1s
    const timeout = setTimeout(() => setFlashClass("text-slate-300"), 1000);
    
    return () => {
      clearTimeout(timeout);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [price]);

  useEffect(() => {
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
      key={`${symbol}`} // Removed price from key to prevent re-mounting which stops animation
      className={`text-4xl font-extrabold tracking-tight inline-block transition-colors duration-300 ${flashClass}`}
    >
      {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
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
  const router = useRouter();
  const [data, setData] = useState<PriceFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [syncInterval, setSyncInterval] = useState<number>(60);
  const [isUpdatingSync, setIsUpdatingSync] = useState(false);
  const [activeSync, setActiveSync] = useState<string | null>(null);
  
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Toggles State
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    sync_toggle_global: true
  });

  const loadToggles = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/sync-toggles`);
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

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/sync-interval`)
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/sync-interval`, {
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/sync-toggle`, {
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
    let url = `${process.env.NEXT_PUBLIC_API_URL}/api/sync`;
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (symbol) params.append("symbol", symbol);
    if (params.toString()) url += "?" + params.toString();

    const syncTarget = symbol ? `asset_${symbol}` : type ? `market_${type}` : "global";
    setActiveSync(syncTarget);
    
    try {
      await fetch(url, { method: "POST" });
    } catch (error) {
      console.error("Failed to force sync", error);
    } finally {
      setActiveSync(null);
    }
  };

  const handleManualSave = async (market: string, symbol: string, price: number) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mock-price/${market}/${symbol}`, {
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
              disabled={activeSync !== null}
              className={`glass-panel px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-600/20 hover:text-blue-400 transition-colors text-slate-300 text-sm font-medium ${activeSync === null ? 'cursor-pointer' : 'cursor-wait opacity-70'}`}
              title="Force fetch all active assets"
            >
              <RefreshCw size={16} className={activeSync === "global" ? "animate-spin text-blue-400" : ""} />
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
                          disabled={activeSync !== null}
                          className={`p-1.5 rounded hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors ${activeSync === null ? 'cursor-pointer' : 'cursor-wait'}`}
                          title={`Force sync all ${market}`}
                        >
                          <RefreshCw size={14} className={activeSync === `market_${market}` ? "animate-spin text-blue-400" : ""} />
                        </button>
                        <Link 
                          href={`/market/${market}`}
                          className="ml-2 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                        >
                          View Details <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                      <Clock size={14} className="text-blue-400" />
                      <span>Last Updated: <span className="text-slate-300">{getMarketLastUpdate(assets)}</span></span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.entries(assets)
                      .slice(0, 8) // Limit to top 8 for dashboard (TODO: Sort by Market Cap when available)
                      .map(([symbol, assetData]) => {
                      const pctChange = assetData.percentChange || 0;
                      const isPositive = pctChange >= 0;
                      
                      // Heatmap color logic
                      let heatClass = "bg-slate-800/30 border-slate-700/50 hover:border-slate-600";
                      let textClass = "text-slate-400";
                      let pillClass = "bg-slate-800 text-slate-400";
                      
                      if (assetData.percentChange !== undefined) {
                        if (pctChange > 0) {
                          heatClass = "bg-emerald-950/40 border-emerald-900/50 hover:border-emerald-700/50";
                          textClass = "text-emerald-400";
                          pillClass = "bg-emerald-500/20 text-emerald-400";
                        } else if (pctChange < 0) {
                          heatClass = "bg-red-950/40 border-red-900/50 hover:border-red-700/50";
                          textClass = "text-red-400";
                          pillClass = "bg-red-500/20 text-red-400";
                        }
                      }

                      return (
                      <div 
                        key={symbol} 
                        onClick={() => router.push(`/asset/${market}/${symbol}`)}
                        className={`rounded-2xl p-6 transition-all duration-300 border backdrop-blur-sm group cursor-pointer hover:scale-[1.02] ${heatClass} ${isManualMode ? 'ring-1 ring-blue-500/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textClass} opacity-80`}>{market}</p>
                            <div className="flex items-center gap-3">
                              <SymbolAvatar symbol={symbol} size={36} />
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-white">{symbol}</h3>
                                <button
                                  onClick={(e) => { e.stopPropagation(); forceSync(undefined, symbol); }}
                                  disabled={activeSync !== null}
                                  className={`p-1.5 rounded-md bg-black/20 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:text-white ${activeSync === null ? 'cursor-pointer' : 'cursor-wait'}`}
                                  title={`Force sync ${symbol}`}
                                >
                                  <RefreshCw size={12} className={activeSync === `asset_${symbol}` ? "animate-spin text-white" : ""} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-sm font-bold ${pillClass}`}>
                            {pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-slate-300/70 text-sm mb-2 truncate" title={assetData.name}>{assetData.name || "Unknown Asset"}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl text-slate-500">$</span>
                            <PriceDisplay 
                              price={assetData.marketPrice || 0} 
                              symbol={symbol}
                              isManualMode={isManualMode}
                              onSave={(newPrice) => handleManualSave(market, symbol, newPrice)}
                            />
                          </div>

                          {market === "usa" && assetData.extendedPrice ? (
                            (() => {
                              const prePost = getPrePostLabel(assetData.updatedAt);
                              return (
                                <div className="mt-3 bg-slate-900/50 rounded-lg p-2.5 text-xs flex justify-between items-center border border-slate-700/50">
                                  <span className={`${prePost.colorClass} font-medium`}>{prePost.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-200 font-bold">${assetData.extendedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className={assetData.extendedPercentChange == 0 ? "text-gray-400 font-bold" : assetData.extendedPercentChange && assetData.extendedPercentChange >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                      {assetData.extendedPercentChange && assetData.extendedPercentChange > 0 ? "+" : ""}{assetData.extendedPercentChange?.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : null}
                          
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock size={12} />
                            {assetData.updatedAt ? new Intl.DateTimeFormat("en-GB", { 
                                day: "2-digit", month: "short",
                                hour: "2-digit", minute: "2-digit", second: "2-digit"
                              }).format(new Date(assetData.updatedAt)) : "Unknown time"}
                          </div>
                          {isManualMode && (
                            <p className="text-xs text-blue-400/70 mt-2 font-medium">✏️ Manual mode active. Press Enter to save.</p>
                          )}
                        </div>
                      </div>
                    )})}
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
