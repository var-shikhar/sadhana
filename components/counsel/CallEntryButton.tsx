"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ButtonBare } from "@/components/ui/button";

const LANG_STORAGE_KEY = "sadhana.counsel.callLang";

interface CallEntryButtonProps {
  className?: string;
}

/** Phone icon + EN│हि pill. One tap on the phone enters /counsel/call
 *  with the selected language. Tapping the EN|हि label cycles between
 *  English and Hindi; persisted in localStorage. */
export function CallEntryButton({ className }: CallEntryButtonProps) {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "hi" || stored === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(stored);
    }
  }, []);

  function startCall() {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    // REPLACE rather than push: voice mode is a peer of chat mode, not a
    // child. We don't want pressing back on voice to land on chat — that
    // would mean two back-presses to leave Counsel. With replace, chat
    // and voice share the same history slot, and back from voice goes to
    // the page that brought the user to Counsel in the first place.
    router.replace(`/counsel/call?lang=${lang}`);
  }

  function toggleLang(e: React.MouseEvent) {
    e.stopPropagation();
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Segmented mode toggle — Text (active here) | Voice (tappable) */}
      <div
        role="tablist"
        aria-label="Counsel mode"
        className="flex items-center rounded-full border border-earth-mid/30 overflow-hidden bg-ink-soft/40"
      >
        {/* Text mode — active state (we're on /counsel) */}
        <div
          role="tab"
          aria-selected="true"
          aria-label="Text mode (current)"
          title="Text mode"
          className="flex items-center gap-1.5 h-8 px-2.5 bg-saffron/15 text-saffron"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="font-pressure-caps text-[10px] tracking-[1.5px] leading-none">
            Text
          </span>
        </div>
        {/* Voice mode — tappable affordance */}
        <ButtonBare
          type="button"
          role="tab"
          aria-selected="false"
          onClick={startCall}
          aria-label="Switch to voice mode"
          title="Switch to voice mode"
          className="flex items-center gap-1.5 h-8 px-2.5 text-parchment/55 hover:text-saffron hover:bg-saffron/10 transition-colors border-l border-earth-mid/30"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
          <span className="font-pressure-caps text-[10px] tracking-[1.5px] leading-none">
            Voice
          </span>
        </ButtonBare>
      </div>
      <ButtonBare
        type="button"
        onClick={toggleLang}
        aria-label={`Call language: ${lang === "en" ? "English" : "Hindi"} (tap to switch)`}
        className="text-[10px] font-lyric tracking-widest text-parchment/50 hover:text-saffron transition-colors px-1.5 py-0.5 rounded border border-earth-mid/30"
      >
        {lang === "en" ? "EN" : "हि"}
      </ButtonBare>
    </div>
  );
}
