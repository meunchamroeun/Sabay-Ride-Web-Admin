"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setSessionExpiredHandler } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { tokenStore, type Session } from "@/lib/api/token-store";

interface AuthContextValue {
  session: Session | null;
  /** false until localStorage has been read on the client */
  ready: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
}

const noopSubscribe = () => () => {};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // localStorage only exists on the client: the server snapshot is "not ready, no session".
  const session = useSyncExternalStore(tokenStore.subscribe, tokenStore.get, () => null);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      router.replace("/login?expired=1");
    });
  }, [queryClient, router]);

  const login = useCallback(async (identifier: string, password: string) => {
    await authApi.login(identifier, password);
    return tokenStore.get()!;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      isAdmin: !!session?.user?.roles?.includes("ADMIN"),
      login,
      logout,
    }),
    [session, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
