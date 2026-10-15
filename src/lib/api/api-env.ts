"use client";

import { useSyncExternalStore } from "react";
import { API_ENV_NAMES, config, type ApiEnv } from "@/config/env";
import { tokenStore } from "./token-store";

/** Which backend this browser talks to. Chosen on the login screen, remembered per browser. */
const KEY = "sabayride.admin.apiEnv";
const listeners = new Set<() => void>();

export function getApiEnv(): ApiEnv {
  try {
    const v = window.localStorage.getItem(KEY) as ApiEnv | null;
    if (v && API_ENV_NAMES.includes(v)) return v;
  } catch {
    /* SSR or blocked storage */
  }
  return config.defaultApiEnv;
}

/** Tokens belong to one backend, so switching ends the current session. */
export function setApiEnv(env: ApiEnv) {
  if (env === getApiEnv()) return;
  try {
    window.localStorage.setItem(KEY, env);
  } catch {
    /* private mode */
  }
  tokenStore.clear();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useApiEnv(): ApiEnv {
  return useSyncExternalStore(subscribe, getApiEnv, () => config.defaultApiEnv);
}
