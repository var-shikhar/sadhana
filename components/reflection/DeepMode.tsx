"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, ButtonBare } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EMOTIONS, type Emotion } from "@/types";
import { LabelTiny } from "@/components/gurukul/LabelTiny";

interface DeepModeData {
  cbtEvent: string;
  cbtThought: string;
  cbtFeeling: string;
  cbtReframe: string;
}

interface DeepModeProps {
  onSubmit: (data: DeepModeData) => Promise<void>;
}

const CBT_STEPS = [
  {
    key: "cbtEvent" as const,
    label: "The event",
    prompt: "What happened today?",
    placeholder: "describe it plainly...",
  },
  {
    key: "cbtThought" as const,
    label: "The thought",
    prompt: "What did you tell yourself?",
    placeholder: "I thought that...",
  },
  {
    key: "cbtFeeling" as const,
    label: "The feeling",
    prompt: "What did your body carry?",
    placeholder: "",
  },
  {
    key: "cbtReframe" as const,
    label: "The reframe",
    prompt: "What is more true?",
    placeholder: "A calmer me would say...",
  },
];

export function DeepMode({ onSubmit }: DeepModeProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<DeepModeData>({
    cbtEvent: "",
    cbtThought: "",
    cbtFeeling: "",
    cbtReframe: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const currentStep = CBT_STEPS[step];
  const isLastStep = step === CBT_STEPS.length - 1;
  const isEmotionStep = currentStep.key === "cbtFeeling";

  function canProceed(): boolean {
    return data[currentStep.key].trim().length > 0;
  }

  function selectEmotion(emotion: Emotion) {
    const current = data.cbtFeeling;
    const emotions = current ? current.split(", ") : [];
    const updated = emotions.includes(emotion)
      ? emotions.filter((e) => e !== emotion)
      : [...emotions, emotion];
    setData((prev) => ({ ...prev, cbtFeeling: updated.join(", ") }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit(data);
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5">
        {CBT_STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-saffron" : "bg-ivory-deep border border-gold/30"
            )}
          />
        ))}
      </div>

      <div className="rounded border border-gold/30 bg-ivory/60 p-4 space-y-2">
        <LabelTiny>{currentStep.label}</LabelTiny>
        <p className="font-lyric-italic text-earth-deep text-sm">{currentStep.prompt}</p>

        {isEmotionStep ? (
          <div className="space-y-4 pt-1">
            <div>
              <p className="label-tiny mb-2">Negative</p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.negative.map((emotion) => {
                  const sel = data.cbtFeeling.includes(emotion);
                  return (
                    <ButtonBare
                      type="button"
                      key={emotion}
                      onClick={() => selectEmotion(emotion)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors font-sans border-saffron",
                        sel ? "bg-saffron/15 text-ink" : "bg-ivory text-earth-deep hover:bg-ivory-deep"
                      )}
                    >
                      {emotion}
                    </ButtonBare>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="label-tiny mb-2">Positive</p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.positive.map((emotion) => {
                  const sel = data.cbtFeeling.includes(emotion);
                  return (
                    <ButtonBare
                      type="button"
                      key={emotion}
                      onClick={() => selectEmotion(emotion)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors font-sans border-sage",
                        sel ? "bg-sage/20 text-ink" : "bg-ivory text-earth-deep hover:bg-ivory-deep"
                      )}
                    >
                      {emotion}
                    </ButtonBare>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <Textarea
            placeholder={currentStep.placeholder}
            value={data[currentStep.key]}
            onChange={(e) =>
              setData((prev) => ({ ...prev, [currentStep.key]: e.target.value }))
            }
            rows={4}
            className="bg-ivory border-gold/40"
          />
        )}
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {isLastStep ? (
          <Button
            className="flex-1"
            disabled={!canProceed() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Saving..." : "Complete Svadhyaya"}
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={!canProceed()}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
