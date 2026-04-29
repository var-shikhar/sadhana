import { cn } from "@/lib/utils";

interface GrowthOrbitProps {
  habitRatio: number; // 0..1, past 7 days
  reflectionRatio: number; // 0..1, past 7 days
  level?: "active" | "steady";
  size?: "sm" | "lg";
  className?: string;
}

export function GrowthOrbit({
  habitRatio,
  reflectionRatio,
  level = "steady",
  size = "sm",
  className,
}: GrowthOrbitProps) {
  const dim = size === "lg" ? 200 : 120;
  const outer = dim * 0.46;
  const inner = dim * 0.32;
  const outerSat = 3 + Math.round(habitRatio * 4);
  const innerSat = 3 + Math.round(reflectionRatio * 4);
  const centerColor = level === "active" ? "#c46a1f" : "#7a8b5c";

  return (
    <div
      className={cn(
        "relative rounded overflow-hidden",
        "bg-linear-to-br from-indigo-night to-indigo-deep",
        className
      )}
      style={{ height: dim, width: "100%" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* outer orbit */}
        <div
          className="absolute rounded-full border border-dashed border-gold/40"
          style={{
            width: outer * 2,
            height: outer * 2,
            animation: "var(--animate-orbit-slow)",
          }}
        >
          <span
            className="absolute rounded-full bg-gold"
            style={{
              top: -outerSat / 2,
              left: `calc(50% - ${outerSat / 2}px)`,
              width: outerSat,
              height: outerSat,
              boxShadow: "0 0 8px #d4a259",
            }}
          />
        </div>
        {/* inner orbit */}
        <div
          className="absolute rounded-full border border-gold/55"
          style={{
            width: inner * 2,
            height: inner * 2,
            animation: "var(--animate-orbit-fast)",
          }}
        >
          <span
            className="absolute rounded-full bg-saffron"
            style={{
              top: -innerSat / 2,
              left: `calc(50% - ${innerSat / 2}px)`,
              width: innerSat,
              height: innerSat,
            }}
          />
        </div>
        {/* center */}
        <span
          className="rounded-full"
          style={{
            width: 8,
            height: 8,
            background: centerColor,
            boxShadow: `0 0 12px ${centerColor}`,
          }}
        />
      </div>
    </div>
  );
}
