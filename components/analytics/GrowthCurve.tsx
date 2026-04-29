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

const SAFFRON = "#c46a1f";
const GOLD = "#d4a259";
const EARTH_DEEP = "#5c4022";

export function GrowthCurve({ scores }: GrowthCurveProps) {
  const data = scores.map((s) => ({
    date: s.date,
    label: format(parseISO(s.date), "MMM d"),
    index: Math.round(s.indexValue),
    score: s.dailyScore,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center font-lyric-italic text-sm text-earth-mid">
        Start logging to see your growth curve
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GOLD} strokeOpacity={0.3} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: EARTH_DEEP, fontFamily: "var(--font-lyric-family)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: EARTH_DEEP, fontFamily: "var(--font-lyric-family)" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#faf6ec",
            border: `1px solid ${GOLD}`,
            borderRadius: "4px",
            color: "#1a1208",
            fontFamily: "var(--font-sans)",
          }}
          formatter={(value) => [`${value}`, "Growth Index"]}
        />
        <Line
          type="monotone"
          dataKey="index"
          stroke={SAFFRON}
          strokeWidth={2}
          dot={{ r: 3, fill: SAFFRON }}
          activeDot={{ r: 5, fill: SAFFRON }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
