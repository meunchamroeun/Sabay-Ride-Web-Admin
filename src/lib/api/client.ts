import { config } from "@/config/env";
import { getApiEnv } from "./api-env";
import { tokenStore, type Session } from "./token-store";
import type { ApiErrorBody, AuthTokens } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

const url = (path: string) => `${config.proxyPath}/${getApiEnv()}${config.apiPrefix}${path}`;

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 202) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.message ?? res.statusText, body.field);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ------------------------------------------------------------------ refresh */

let inflight: Promise<Session | null> | null = null;
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

/**
 * POST /auth/refresh is single-use: the token sent is spent and a new one comes back.
 * Sending a spent token is treated as theft and revokes every session, so we must never
 * refresh twice with the same token — not from two requests and not from two tabs.
 * Within a tab we share one promise; across tabs we take a Web Lock and re-check storage.
 */
export function refreshSession(): Promise<Session | null> {
  if (inflight) return inflight;
  const staleToken = tokenStore.get()?.refreshToken;

  const run = async (): Promise<Session | null> => {
    const current = tokenStore.get();
    if (!current) return null;
    // Another tab already rotated while we waited for the lock.
    if (current.refreshToken !== staleToken && current.expiresAt - Date.now() > config.refreshSkewSeconds * 1000) {
      return current;
    }
    try {
      const res = await fetch(url("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const tokens = await parse<AuthTokens>(res);
      return tokenStore.setFromTokens(tokens, current.user);
    } catch {
      tokenStore.clear();
      onSessionExpired?.();
      return null;
    }
  };

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const p = (async (): Promise<Session | null> => (locks ? locks.request("sabayride-refresh", run) : run()))().finally(
    () => {
      inflight = null;
    },
  );
  inflight = p;
  return p;
}

async function validAccessToken(): Promise<string | null> {
  const s = tokenStore.get();
  if (!s) return null;
  if (s.expiresAt - Date.now() > config.refreshSkewSeconds * 1000) return s.accessToken;
  return (await refreshSession())?.accessToken ?? null;
}

/* ------------------------------------------------------------------ request */

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  auth?: boolean;
  signal?: AbortSignal;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, signal } = opts;
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";

  const send = async (token: string | null) =>
    fetch(url(path) + (qs === "?" ? "" : qs), {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let token = auth ? await validAccessToken() : null;
  let res = await send(token);

  // Clock skew or server-side expiry: refresh once and retry.
  if (res.status === 401 && auth && token) {
    token = (await refreshSession())?.accessToken ?? null;
    if (token) res = await send(token);
  }
  return parse<T>(res);
}
