"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";

type Asset = {
  id: number;
  symbol: string;
  name: string;
  type: string; // Market
  is_active: boolean;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("usa");
  const [price, setPrice] = useState("");

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/assets");
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch assets", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("http://localhost:8080/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          symbol, 
          name, 
          type, 
          is_active: true,
          price: price ? parseFloat(price) : 0 
        }),
      });
      setSymbol("");
      setName("");
      setPrice("");
      fetchAssets();
    } catch (error) {
      console.error("Failed to add asset", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await fetch(`http://localhost:8080/api/assets/${id}`, { method: "DELETE" });
      fetchAssets();
    } catch (error) {
      console.error("Failed to delete asset", error);
    }
  };

  return (
    <main className="p-8 md:p-12 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Asset Management</h1>
          <p className="text-slate-400">Add or remove assets to track in your price feed.</p>
        </div>
        <button onClick={fetchAssets} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Plus className="text-blue-400" /> Add New Asset
            </h2>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Market (Type)</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="usa">USA (Stock)</option>
                  <option value="th">TH (Stock)</option>
                  <option value="crypto">Crypto</option>
                  <option value="GOLD">Gold</option>
                  <option value="cash">Cash/Forex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Symbol</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Name / Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Apple Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Initial Price (Optional)</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="e.g., 150.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Plus size={18} /> Save Asset
              </button>
            </form>
          </div>
        </div>

        {/* Table Panel */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="p-4 text-sm font-medium text-slate-400">Market</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Symbol</th>
                  <th className="p-4 text-sm font-medium text-slate-400">Name</th>
                  <th className="p-4 text-sm font-medium text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading && assets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">Loading assets...</td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No assets found in database.</td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded uppercase tracking-wider">
                          {asset.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">{asset.symbol}</td>
                      <td className="p-4 text-slate-400">{asset.name}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
