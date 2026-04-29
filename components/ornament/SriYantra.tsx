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

export function SriYantra({ className, opacity = 0.13, tone = "saffron", size = 200 }: OrnamentProps) {
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
      <g fill="none" stroke={stroke} strokeWidth="0.4">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="36" />
        <circle cx="50" cy="50" r="26" />
        <polygon points="50,12 88,68 12,68" />
        <polygon points="50,88 12,32 88,32" />
        <circle cx="50" cy="50" r="3" fill={stroke} fillOpacity="0.6" />
      </g>
    </svg>
  );
}
