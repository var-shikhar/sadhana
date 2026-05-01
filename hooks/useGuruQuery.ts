"use client";

import { useMutation } from "@tanstack/react-query";
import type { RetrievalResult } from "@/lib/scripture/retrieve";

interface QueryPayload {
  query: string;
  boostTags?: string[];
  history?: Array<{ role: "user" | "acharya"; text: string }>;
  retrievalOnly?: boolean;
}

export interface CounselResponse extends RetrievalResult {
  answer: string | null;
  citationsUsed: string[];
  modelUsed: string | null;
  brokeCharacter: boolean;
}

async function postQuery(payload: QueryPayload): Promise<CounselResponse> {
  const res = await fetch("/api/guru/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Query failed");
  }
  return res.json();
}

export function useGuruQuery() {
  return useMutation({
    mutationFn: postQuery,
  });
}
