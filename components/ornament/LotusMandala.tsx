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

export function LotusMandala({ className, opacity = 0.13, tone = "saffron", size = 240 }: OrnamentProps) {
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
        <circle cx="50" cy="50" r="45" />
        <circle cx="50" cy="50" r="32" />
      </g>
      <g fill={stroke}>
        <path d="M 50 16 L 56 30 L 50 26 L 44 30 Z" fillOpacity="0.6" />
        <path d="M 50 84 L 44 70 L 50 74 L 56 70 Z" fillOpacity="0.6" />
        <path d="M 84 50 L 70 56 L 74 50 L 70 44 Z" fillOpacity="0.6" />
        <path d="M 16 50 L 30 44 L 26 50 L 30 56 Z" fillOpacity="0.6" />
        <path d="M 74 26 L 64 36 L 64 30 L 60 30 Z" fillOpacity="0.4" />
        <path d="M 74 74 L 60 70 L 64 70 L 64 64 Z" fillOpacity="0.4" />
        <path d="M 26 74 L 36 64 L 36 70 L 40 70 Z" fillOpacity="0.4" />
        <path d="M 26 26 L 40 30 L 36 30 L 36 36 Z" fillOpacity="0.4" />
      </g>
    </svg>
  );
}
