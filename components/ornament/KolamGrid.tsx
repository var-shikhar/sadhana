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

export function KolamGrid({ className, opacity = 0.10, tone = "earth", size = 140 }: OrnamentProps) {
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
      <g fill={stroke} stroke={stroke} strokeWidth="0.4">
        {[20, 50, 80].flatMap((y) =>
          [20, 50, 80].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />)
        )}
        <g fill="none">
          <path d="M 20 20 Q 35 5, 50 20 T 80 20" />
          <path d="M 20 50 Q 35 35, 50 50 T 80 50" />
          <path d="M 20 80 Q 35 65, 50 80 T 80 80" />
          <path d="M 20 20 Q 5 35, 20 50 T 20 80" />
          <path d="M 50 20 Q 35 35, 50 50 T 50 80" />
          <path d="M 80 20 Q 95 35, 80 50 T 80 80" />
        </g>
      </g>
    </svg>
  );
}
