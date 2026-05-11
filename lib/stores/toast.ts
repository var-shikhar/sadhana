"use client";

import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "warning" | "saffron";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  /** ms before auto-dismiss; 0 means sticky. */
  durationMs: number;
}

interface ToastState {
  toasts: Toast[];
  push: (msg: string, opts?: { tone?: ToastTone; durationMs?: number }) => void;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION_MS = 2400;

/**
 * In-app toast queue. The store is the single source of truth; the
 * `<Toaster />` component subscribes and renders. Mutations call
 * `useToast.getState().push(...)` directly so we don't need every call
 * site to be a hook context.
 *
 * Browser push notifications are a separate, deferred concern — they need
 * a service worker, permission UX, and OS-level scheduling. This system
 * is intentionally in-app only.
 */
export const useToast = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (message, opts = {}) => {
    const tone = opts.tone ?? "neutral";
    const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone, durationMs }] }));
    if (durationMs > 0) {
      setTimeout(() => get().dismiss(id), durationMs);
    }
  },
  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Convenience helpers — call from mutation handlers. */
export const toast = {
  show: (msg: string) => useToast.getState().push(msg, { tone: "neutral" }),
  success: (msg: string) => useToast.getState().push(msg, { tone: "success" }),
  warning: (msg: string) => useToast.getState().push(msg, { tone: "warning" }),
  saffron: (msg: string) => useToast.getState().push(msg, { tone: "saffron" }),
};
