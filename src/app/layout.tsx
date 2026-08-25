import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Activity, LayoutDashboard, Database } from "lucide-react";

export const metadata: Metadata = {
  title: "WealthSphere Price Feed",
  description: "Real-time asset price tracking dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased min-h-screen flex flex-col">
        <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-extrabold text-xl tracking-tight">
              <Activity className="w-6 h-6" /> WealthSphere
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-all">
                <LayoutDashboard size={18} /> Live Dashboard
              </Link>
              <Link href="/assets" className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-all">
                <Database size={18} /> Manage Assets
              </Link>
            </div>
          </div>
        </nav>
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
