"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { type GrowthScore } from "@/types";
import { format, parseISO } from "date-fns";

interface GrowthCurveProps {
  scores: GrowthScore[];
}

export function GrowthCurve({ scores }: GrowthCurveProps) {
  const data = scores.map((s) => ({
    date: s.date,
    label: format(parseISO(s.date), "MMM d"),
    index: Math.round(s.indexValue),
    score: s.dailyScore,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Start logging to see your growth curve
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
          }}
          formatter={(value) => [`${value}`, "Growth Index"]}
        />
        <Line
          type="monotone"
          dataKey="index"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ r: 3, fill: "#F59E0B" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
