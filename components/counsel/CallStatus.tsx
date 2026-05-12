"use client";

import { cn } from "@/lib/utils";
import type { CallStatusKind } from "@/lib/voice/types";

const LABELS_EN: Record<CallStatusKind, string> = {
  idle: " ",
  connecting: "Connecting…",
  listening: "Listening…",
  acharya_speaking: "Acharya is speaking…",
  tool_running: "Consulting the verses…",
  reconnecting: "Reconnecting…",
  ended: "Call ended",
};

const LABELS_HI: Record<CallStatusKind, string> = {
  idle: " ",
  connecting: "जुड़ रहा है…",
  listening: "सुन रहा हूँ…",
  acharya_speaking: "आचार्य बोल रहे हैं…",
  tool_running: "श्लोकों से परामर्श हो रहा है…",
  reconnecting: "पुनः जुड़ रहा है…",
  ended: "कॉल समाप्त",
};

interface CallStatusProps {
  status: CallStatusKind;
  language: "en" | "hi";
}

export function CallStatus({ status, language }: CallStatusProps) {
  const labels = language === "hi" ? LABELS_HI : LABELS_EN;
  return (
    <div className="flex items-center gap-2 text-sm font-lyric-italic text-parchment/70">
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          status === "acharya_speaking"
            ? "bg-saffron animate-pulse"
            : status === "tool_running"
              ? "bg-rose-300 animate-pulse"
              : status === "listening"
                ? "bg-parchment/60"
                : "bg-parchment/30"
        )}
      />
      <span>{labels[status]}</span>
    </div>
  );
}
