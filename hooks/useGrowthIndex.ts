"use client";

import { useState, useEffect, useCallback } from "react";
import { type GrowthScore } from "@/types";

export function useGrowthIndex() {
  const [current, setCurrent] = useState<{
    indexValue: number;
    dailyScore: number;
  }>({ indexValue: 100, dailyScore: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCurrent = useCallback(async () => {
    const res = await fetch("/api/growth");
    const data = await res.json();
    setCurrent({
      indexValue: Number(data.indexValue) || 100,
      dailyScore: Number(data.dailyScore) || 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  async function recalculate() {
    const res = await fetch("/api/growth", { method: "POST" });
    const data = await res.json();
    setCurrent({
      indexValue: data.indexValue,
      dailyScore: data.dailyScore,
    });
    return data;
  }

  return { current, loading, recalculate };
}

export function useGrowthHistory(from: string, to: string) {
  const [scores, setScores] = useState<GrowthScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      const res = await fetch(`/api/growth?from=${from}&to=${to}`);
      const data = await res.json();
      setScores(
        data.map((s: Record<string, string>) => ({
          ...s,
          completionPts: Number(s.completionPts),
          reflectionPts: Number(s.reflectionPts),
          consistencyPts: Number(s.consistencyPts),
          dailyScore: Number(s.dailyScore),
          indexValue: Number(s.indexValue),
        }))
      );
      setLoading(false);
    }
    fetchScores();
  }, [from, to]);

  return { scores, loading };
}
