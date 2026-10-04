"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Access = "loading" | "signed-out" | "forbidden" | "ready";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<Access>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      if (!currentUser) {
        setAccess("signed-out");
        return;
      }
      try {
        const token = await currentUser.getIdTokenResult();
        if (active) setAccess(token.claims.admin === true ? "ready" : "forbidden");
      } catch {
        if (active) setAccess("signed-out");
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdTokenResult(true);
      setAccess(token.claims.admin === true ? "ready" : "forbidden");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed");
    }
  };

  const refreshAccess = async () => {
    if (!user) return;
    setError(null);
    try {
      const token = await user.getIdTokenResult(true);
      setAccess(token.claims.admin === true ? "ready" : "forbidden");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh access");
    }
  };

  if (access === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Checking CMS access…</div>;
  }
  if (access !== "ready") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Wealth Sphere CMS</h1>
          <p className="text-slate-300">
            {access === "forbidden"
              ? "This Firebase account does not have the admin claim required by the production API."
              : "Sign in with your admin Google account to manage the price feed."}
          </p>
          {user?.email && <p className="text-sm text-slate-400">{user.email}</p>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {access === "signed-out" ? (
            <button onClick={signIn} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white cursor-pointer">Sign in with Google</button>
          ) : (
            <div className="flex gap-3">
              <button onClick={refreshAccess} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white cursor-pointer">Refresh access</button>
              <button onClick={() => signOut(auth)} className="rounded-lg border border-slate-600 px-4 py-2 text-white cursor-pointer">Use another account</button>
            </div>
          )}
        </div>
      </main>
    );
  }
  return <>
    <div className="bg-slate-900 px-6 py-2 text-right text-xs text-slate-400">
      {user?.email} <button onClick={() => signOut(auth)} className="ml-3 text-blue-400 cursor-pointer">Sign out</button>
    </div>
    {children}
  </>;
}
