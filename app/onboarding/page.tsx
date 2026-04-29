"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PillarPicker } from "@/components/onboarding/PillarPicker";
import { HabitPicker } from "@/components/onboarding/HabitPicker";
import { SankalpaForm } from "@/components/onboarding/SankalpaForm";
import { type PermaPillar } from "@/types";
import { PressureLabel } from "@/components/gurukul/PressureLabel";

function FlameIndicator({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block flex-1 h-1.5 rounded-full transition-colors"
      style={{
        background: filled ? "#c46a1f" : "#f4ecd8",
        border: "1px solid #d4a259",
      }}
    />
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedPillars, setSelectedPillars] = useState<PermaPillar[]>([]);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [sankalpas, setSankalpas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function togglePillar(pillar: PermaPillar) {
    setSelectedPillars((prev) =>
      prev.includes(pillar)
        ? prev.filter((p) => p !== pillar)
        : prev.length < 3
          ? [...prev, pillar]
          : prev
    );
  }

  function toggleHabit(habitName: string) {
    setSelectedHabits((prev) =>
      prev.includes(habitName)
        ? prev.filter((h) => h !== habitName)
        : prev.length < 3
          ? [...prev, habitName]
          : prev
    );
  }

  function updateSankalpa(habitName: string, sankalpa: string) {
    setSankalpas((prev) => ({ ...prev, [habitName]: sankalpa }));
  }

  async function handleComplete() {
    setLoading(true);
    const res = await fetch("/api/user-habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habits: selectedHabits.map((name) => ({
          name,
          sankalpa: sankalpas[name] || null,
        })),
        completeOnboarding: true,
      }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  const STEP_TITLES = [
    "",
    "Choose Your Focus",
    "Pick 3 Starter Habits",
    "Set Your Sankalpa",
  ];

  const STEP_SUBTITLES = [
    "",
    "Select 1–3 PERMA pillars to focus on first. You can always explore others later.",
    "Choose 3 habits from your selected pillars to begin your daily practice.",
    "When and where will you do each habit? A firm resolve triples completion.",
  ];

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <FlameIndicator key={s} filled={s <= step} />
        ))}
      </div>

      <div className="mb-6 space-y-2 text-center">
        <PressureLabel caps tone="saffron" className="text-xs">
          Step {step} of 3
        </PressureLabel>
        <h1 className="font-lyric text-3xl text-ink">{STEP_TITLES[step]}</h1>
        <p className="font-lyric-italic text-sm text-earth-deep">{STEP_SUBTITLES[step]}</p>
      </div>

      {step === 1 && (
        <PillarPicker selected={selectedPillars} onToggle={togglePillar} />
      )}
      {step === 2 && (
        <HabitPicker
          pillars={selectedPillars}
          selected={selectedHabits}
          onToggle={toggleHabit}
        />
      )}
      {step === 3 && (
        <SankalpaForm
          habits={selectedHabits}
          sankalpas={sankalpas}
          onChange={updateSankalpa}
        />
      )}

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            className="flex-1"
            disabled={
              (step === 1 && selectedPillars.length === 0) ||
              (step === 2 && selectedHabits.length === 0)
            }
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            className="flex-1 font-pressure-caps"
            disabled={loading}
            onClick={handleComplete}
          >
            {loading ? "Setting up..." : "Begin Your Sadhana"}
          </Button>
        )}
      </div>
    </div>
  );
}
