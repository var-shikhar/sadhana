type Tone = "saffron" | "earth" | "indigo";

interface OrnamentProps {
  className?: string;
  opacity?: number;
  tone?: Tone;
  size?: number;
}

const TONE_STROKE: Record<Tone, string> = {
  saffron: "#c46a1f",
  earth: "#8b5a2b",
  indigo: "#d4a259",
};

export function VastuGrid({ className, opacity = 0.10, tone = "earth", size = 160 }: OrnamentProps) {
  const stroke = TONE_STROKE[tone];
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ opacity }}
    >
      <g fill="none" stroke={stroke} strokeWidth="0.3">
        <line x1="0" y1="33" x2="100" y2="33" />
        <line x1="0" y1="66" x2="100" y2="66" />
        <line x1="33" y1="0" x2="33" y2="100" />
        <line x1="66" y1="0" x2="66" y2="100" />
        <circle cx="33" cy="33" r="8" />
        <circle cx="66" cy="66" r="8" />
        <circle cx="33" cy="66" r="8" />
        <circle cx="66" cy="33" r="8" />
      </g>
    </svg>
  );
}
