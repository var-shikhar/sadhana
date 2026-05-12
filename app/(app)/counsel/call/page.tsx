"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CallScreen } from "@/components/counsel/CallScreen";

const LANG_STORAGE_KEY = "sadhana.counsel.callLang";

export default function CounselCallPage() {
  const search = useSearchParams();
  const [language, setLanguage] = useState<"en" | "hi" | null>(null);

  useEffect(() => {
    // Resolve language from query param OR localStorage OR default en.
    const fromQuery = search.get("lang");
    const fromStorage =
      typeof window !== "undefined"
        ? (window.localStorage.getItem(LANG_STORAGE_KEY) as "en" | "hi" | null)
        : null;
    const chosen =
      fromQuery === "hi" || fromQuery === "en"
        ? fromQuery
        : fromStorage === "hi"
          ? "hi"
          : "en";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguage(chosen);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, chosen);
    } catch {
      // ignore
    }
  }, [search]);

  if (!language) return null;
  return <CallScreen language={language} />;
}
