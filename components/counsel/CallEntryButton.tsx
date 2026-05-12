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
    router.push(`/counsel/call?lang=${lang}`);
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
    <div className={cn("flex items-center gap-1", className)}>
      <ButtonBare
        type="button"
        onClick={startCall}
        aria-label="Start a voice call with the Acharya"
        className="text-parchment/60 hover:text-saffron transition-colors flex items-center justify-center w-9 h-9 rounded-full"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </ButtonBare>
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
