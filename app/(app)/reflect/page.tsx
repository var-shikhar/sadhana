"use client";

import { Card } from "@/components/ui/card";
import { QuickMode } from "@/components/reflection/QuickMode";
import { DeepMode } from "@/components/reflection/DeepMode";
import { useReflection, useSubmitReflection } from "@/hooks/useReflection";
import { type PitfallTag } from "@/types";
import { OmGlyph } from "@/components/gurukul/OmGlyph";
import { SanskritTerm } from "@/components/gurukul/SanskritTerm";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { LotusMandala } from "@/components/ornament/LotusMandala";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui";

export default function ReflectPage() {
  const { reflection, loading } = useReflection();
  const submit = useSubmitReflection();
  const mode = useUIStore((s) => s.reflectMode);
  const setMode = useUIStore((s) => s.setReflectMode);

  async function handleQuickSubmit(tags: PitfallTag[], note: string) {
    await submit.mutateAsync({
      mode: "quick",
      quickTags: tags,
      quickNote: note || null,
    });
  }

  async function handleDeepSubmit(data: {
    cbtEvent: string;
    cbtThought: string;
    cbtFeeling: string;
    cbtReframe: string;
  }) {
    await submit.mutateAsync({ mode: "deep", ...data });
  }

  if (loading) {
    return <p className="font-lyric-italic text-earth-mid py-6">Loading...</p>;
  }

  if (reflection) {
    return (
      <div className="space-y-6 py-6 px-2 relative min-h-[60vh] bg-linear-to-b from-ivory-deep to-parchment rounded-lg">
        <LotusMandala
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          tone="earth"
          opacity={0.13}
        />
        <header className="text-center space-y-2 relative">
          <OmGlyph size={32} tone="saffron" />
          <div className="text-ink-soft">
            <SanskritTerm term="Svadhyaya" gloss="self-study" />
          </div>
        </header>
        <GoldRule width="section" />
        <Card className="p-6 text-center bg-ivory/70 border-gold/40 relative">
          <p className="font-lyric text-xl text-ink">Today&apos;s reflection is complete.</p>
          <p className="font-lyric-italic text-sm text-earth-mid mt-2">
            {reflection.mode === "deep"
              ? "Deep reflection — 25 pts"
              : "Quick reflection — 15 pts"}
          </p>
          <p className="font-lyric-italic text-sm text-earth-deep mt-4">
            &quot;Svadhyaya — the practice of self-study — is complete for today.&quot;
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 px-2 relative bg-linear-to-b from-ivory-deep to-parchment min-h-[60vh] rounded-lg">
      <LotusMandala
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        tone="earth"
        opacity={0.13}
      />

      <header className="text-center space-y-2 relative">
        <OmGlyph size={32} tone="saffron" />
        <div className="text-ink-soft">
          <SanskritTerm term="Svadhyaya" gloss="self-study" />
        </div>
        <p className="font-lyric-italic text-base text-earth-deep">
          What did the day reveal?
        </p>
      </header>

      <GoldRule width="section" />

      <div className="relative">
        <div className="flex w-full rounded-full border border-gold/40 bg-ivory/70 p-1 mb-5">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={cn(
              "flex-1 rounded-full py-2 text-sm transition-all",
              mode === "quick"
                ? "bg-saffron text-ivory shadow-sm font-pressure-caps text-xs"
                : "text-earth-deep font-lyric"
            )}
          >
            {mode === "quick" ? "Quick · 15" : "Quick"}
          </button>
          <button
            type="button"
            onClick={() => setMode("deep")}
            className={cn(
              "flex-1 rounded-full py-2 text-sm transition-all",
              mode === "deep"
                ? "bg-saffron text-ivory shadow-sm font-pressure-caps text-xs"
                : "text-earth-deep font-lyric"
            )}
          >
            {mode === "deep" ? "Deep · 25" : "Deep"}
          </button>
        </div>

        {mode === "quick" ? (
          <QuickMode onSubmit={handleQuickSubmit} />
        ) : (
          <DeepMode onSubmit={handleDeepSubmit} />
        )}
      </div>
    </div>
  );
}
