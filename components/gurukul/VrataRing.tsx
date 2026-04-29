"use client";

import { cn } from "@/lib/utils";
import { TapasFlame } from "./TapasFlame";

interface VrataRingProps {
  /** Days completed so far (0..daysTarget) */
  daysCompleted: number;
  /** Total target days = baseDays + extensionDays */
  daysTarget: number;
  /** The vrata's traditional name (saptaha/trayivimshati/...) shown as a small inscription */
  lengthLabel: string;
  /** Tapas brightness 0..1 — fed to the inner flame */
  brightness?: number;
  /** Outer ring diameter in px */
  size?: number;
  className?: string;
}

/**
 * The keystone Home component. A circular ring whose arc fills as the
 * vrata progresses. Inside the ring sits the Tapas flame. Below it,
 * the vrata's inscription ("VRATA · trayivimshati").
 */
export function VrataRing({
  daysCompleted,
  daysTarget,
  lengthLabel,
  brightness = 1,
  size = 220,
  className,
}: VrataRingProps) {
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const progress =
    daysTarget > 0 ? Math.min(1, daysCompleted / daysTarget) : 0;
  const dashOffset = circumference * (1 - progress);

  const flameSize = Math.round(size * 0.35);

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#d4b88a"
          strokeWidth="2"
          opacity="0.4"
        />
        {/* progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#c46a1f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>

      {/* flame inside the ring (slightly above center to leave room for inscription) */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "calc(50% - 8px)",
          transform: "translate(-50%, -55%)",
        }}
      >
        <TapasFlame size={flameSize} brightness={brightness} />
      </div>

      {/* inscription */}
      <div
        className="absolute left-0 right-0 text-center"
        style={{ bottom: 18 }}
      >
        <div className="font-pressure-caps text-[8px] text-earth-mid">VRATA</div>
        <div className="font-lyric-italic text-xs text-earth-deep">
          {lengthLabel}
        </div>
      </div>
    </div>
  );
}
