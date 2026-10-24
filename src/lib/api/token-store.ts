import type { AuthTokens, AuthUser } from "./types";

const KEY = "sabayride.admin.session";

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
  user: AuthUser;
  /** Demo admin session: requests are answered by the in-browser mock, never the real API. */
  demo?: boolean;
}

type Listener = (s: Session | null) => void;
let cache: { raw: string | null; value: Session | null } = { raw: null, value: null };
const listeners = new Set<Listener>();

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const tokenStore = {
  /** Returns a stable object while storage is unchanged, so it works with useSyncExternalStore. */
  get(): Session | null {
    const raw = safeStorage()?.getItem(KEY) ?? null;
    if (raw === cache.raw) return cache.value;
    let value: Session | null = null;
    try {
      value = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      value = null;
    }
    // A sample-data session left from before the demo was switched off: sign it out.
    if (value?.demo && process.env.NEXT_PUBLIC_DEMO_ADMIN !== "true") {
      safeStorage()?.removeItem(KEY);
      value = null;
      cache = { raw: null, value };
      return value;
    }
    cache = { raw, value };
    return value;
  },

  setFromTokens(t: AuthTokens, fallbackUser?: AuthUser): Session {
    const session: Session = {
      accessToken: t.accessToken,
      refreshToken: t.refreshToken,
      expiresAt: Date.now() + (t.expiresIn ?? 900) * 1000,
      user: t.user ?? fallbackUser!,
    };
    safeStorage()?.setItem(KEY, JSON.stringify(session));
    listeners.forEach((l) => l(session));
    return session;
  },

  /** Starts a demo admin session (no real tokens). */
  setDemo(user: AuthUser): Session {
    const session: Session = {
      accessToken: "demo-admin-token",
      refreshToken: "demo-admin-token",
      expiresAt: Date.now() + 365 * 86_400_000,
      user,
      demo: true,
    };
    safeStorage()?.setItem(KEY, JSON.stringify(session));
    listeners.forEach((l) => l(session));
    return session;
  },

  clear() {
    safeStorage()?.removeItem(KEY);
    listeners.forEach((l) => l(null));
  },

  subscribe(l: Listener) {
    listeners.add(l);
    // Keep tabs in sync: another tab may rotate the refresh token or log out.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) l(tokenStore.get());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  },
};
