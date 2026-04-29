import { cn } from "@/lib/utils";
import { VastuGrid } from "@/components/ornament/VastuGrid";

export interface FolioReflection {
  id: string;
  date: string; // YYYY-MM-DD
  mode: "quick" | "deep";
  quickNote: string | null;
  quickTags: string[] | null;
  cbtReframe: string | null;
  cbtEvent: string | null;
}

interface FolioProps {
  reflection?: FolioReflection;
  position: "focus" | "left" | "right";
  showSeal?: boolean;
  className?: string;
}

function formatFolioDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-US", { month: "long" });
  return `${d.getDate()} ${month}`;
}

const POSITION_TRANSFORMS = {
  focus: "scale-100 z-20 shadow-[0_8px_24px_rgba(92,46,14,0.25)]",
  left: "scale-90 -translate-x-2 opacity-80 z-10 [transform:rotateY(20deg)]",
  right: "scale-90 translate-x-2 opacity-80 z-10 [transform:rotateY(-20deg)]",
} as const;

export function Folio({ reflection, position, showSeal = false, className }: FolioProps) {
  return (
    <div
      className={cn(
        "relative w-[220px] h-[300px] rounded-sm border border-earth-mid p-4",
        "bg-linear-to-br from-ivory-deep to-parchment",
        "transition-transform duration-500",
        POSITION_TRANSFORMS[position],
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <VastuGrid
        className="absolute inset-0 pointer-events-none"
        tone="earth"
        opacity={0.10}
        size={220}
      />
      <div className="absolute inset-0 pointer-events-none rounded-sm bg-[repeating-linear-gradient(0deg,transparent_0,transparent_20px,rgba(139,90,43,0.08)_20px,rgba(139,90,43,0.08)_21px)]" />

      {showSeal && (
        <div
          aria-label="First folio"
          className="absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full bg-saffron flex items-center justify-center shadow-[0_2px_6px_rgba(92,46,14,0.3)]"
        >
          <span className="font-pressure-caps text-[6px] text-ivory">FIRST</span>
        </div>
      )}

      {reflection ? (
        <div className="relative space-y-3">
          <div className="font-pressure-caps text-[10px] text-saffron">
            {formatFolioDate(reflection.date)}
          </div>
          {reflection.mode === "quick" ? (
            <>
              {reflection.quickNote && (
                <p className="font-lyric-italic text-sm text-ink leading-relaxed">
                  &quot;{reflection.quickNote}&quot;
                </p>
              )}
              {reflection.quickTags && reflection.quickTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {reflection.quickTags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-2 py-0.5 rounded-full border border-earth-mid text-earth-deep"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {reflection.cbtReframe && (
                <p className="font-lyric-italic text-sm text-ink leading-relaxed">
                  &quot;{reflection.cbtReframe}&quot;
                </p>
              )}
              {reflection.cbtEvent && (
                <div className="pt-2 space-y-0.5">
                  <div className="label-tiny text-[8px]">The event</div>
                  <p className="text-[11px] text-earth-deep leading-snug">
                    {reflection.cbtEvent}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="relative h-full flex items-center justify-center">
          <p className="font-lyric-italic text-sm text-earth-mid text-center px-4">
            blank, awaiting tomorrow
          </p>
        </div>
      )}
    </div>
  );
}
