"use client";

import { useToast, type ToastTone } from "@/lib/stores/toast";
import { cn } from "@/lib/utils";

const TONE_CLS: Record<ToastTone, string> = {
  neutral: "bg-ink/95 text-ivory border-ink",
  success: "bg-sage/95 text-ivory border-sage",
  warning: "bg-saffron/95 text-ivory border-saffron",
  saffron: "bg-saffron/95 text-ivory border-saffron",
};

/**
 * Mounts at the root of the app shell. Subscribes to the toast store and
 * renders queued toasts in the bottom-center, above the BottomNav and the
 * goal-detail sticky bar so they never get clipped.
 */
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed left-0 right-0 z-200 flex flex-col items-center gap-2 px-3 pointer-events-none"
      // Sit above the BottomNav (~64px) + the sticky goal-detail bar (~52px)
      // when present. 140px is the safe ceiling and won't interfere with
      // the global header.
      style={{ bottom: "calc(140px + env(safe-area-inset-bottom))" }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto rounded-full border px-4 py-2 text-[12px] font-pressure-caps tracking-wider shadow-lg backdrop-blur",
            "animate-in slide-in-from-bottom-2 fade-in duration-200",
            TONE_CLS[t.tone],
          )}
          aria-label={`Dismiss: ${t.message}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
