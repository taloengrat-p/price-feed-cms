"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

const getGradient = (symbol: string) => {
  const colors = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-emerald-500 to-teal-400",
    "from-orange-500 to-amber-400",
    "from-rose-500 to-red-400",
    "from-indigo-500 to-blue-400",
    "from-fuchsia-500 to-purple-400",
    "from-cyan-600 to-blue-500",
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const SymbolAvatar = ({ symbol, size = 40 }: { symbol: string; size?: number }) => {
  const [logo, setLogo] = useState<{ symbol: string; url: string } | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    const load = async () => {
      try {
        const response = await adminFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/logo/${encodeURIComponent(symbol)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Logo unavailable");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("Invalid logo response");
        objectUrl = URL.createObjectURL(blob);
        if (controller.signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        } else {
          setLogo({ symbol, url: objectUrl });
        }
      } catch {
        if (!controller.signal.aborted) setImgError(true);
      }
    };
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [symbol]);

  const cleanSymbol = symbol.split("/")[0].split("-")[0].replace(/[^a-zA-Z0-9]/g, "");
  const displayText = cleanSymbol.substring(0, 2).toUpperCase();
  const gradient = getGradient(symbol);

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-slate-900 flex-shrink-0 overflow-hidden bg-slate-800"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {logo?.symbol === symbol && !imgError ? (
        // The API authenticates the fetch before redirecting to the logo image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo.url} alt={symbol} onError={() => setImgError(true)} className="w-full h-full object-cover bg-white" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient}`}>
          {displayText}
        </div>
      )}
    </div>
  );
};
