"use client";

import { useState, useEffect } from "react";
import { type Reflection } from "@/types";
import { todayDate } from "@/lib/utils";

export function useReflection() {
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReflection() {
      const res = await fetch(`/api/reflections?date=${todayDate()}`);
      const data = await res.json();
      setReflection(data);
      setLoading(false);
    }
    fetchReflection();
  }, []);

  return { reflection, loading };
}
