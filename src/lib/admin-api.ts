import { auth } from "@/lib/firebase";

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sign in to use the CMS");
  }
  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.admin !== true) {
    throw new Error("This account does not have CMS admin access");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${tokenResult.token}`);
  return fetch(input, { ...init, headers, cache: init.cache ?? "no-store" });
}
