"use client";

import { useEffect, useState } from "react";
import type { FolioReflection } from "@/components/archive/Folio";

type ApiReflection = {
  id: string;
  date: string;
  mode: "quick" | "deep";
  quickNote: string | null;
  quickTags: string[] | null;
  cbtReframe: string | null;
  cbtEvent: string | null;
};

export function useArchive() {
  const [reflections, setReflections] = useState<FolioReflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/reflections");
      if (cancelled) return;

      if (!res.ok) {
        setReflections([]);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as ApiReflection[];
      if (cancelled) return;

      setReflections(
        data.map((r) => ({
          id: r.id,
          date: r.date,
          mode: r.mode,
          quickNote: r.quickNote,
          quickTags: r.quickTags,
          cbtReframe: r.cbtReframe,
          cbtEvent: r.cbtEvent,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { reflections, loading };
}
