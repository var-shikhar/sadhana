"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EMOTIONS, type Emotion } from "@/types";

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
    label: "What happened?",
    prompt: "Describe the situation briefly.",
    placeholder: "Today at work, I...",
  },
  {
    key: "cbtThought" as const,
    label: "What did you tell yourself?",
    prompt: "What was the belief or thought in that moment?",
    placeholder: "I thought that...",
  },
  {
    key: "cbtFeeling" as const,
    label: "How did that make you feel?",
    prompt: "Select the emotion(s) that resonate.",
    placeholder: "",
  },
  {
    key: "cbtReframe" as const,
    label: "Pratipaksha Bhavana",
    prompt: "What would a wiser, calmer version of you say about this?",
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
              i <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{currentStep.label}</h3>
        <p className="text-sm text-muted-foreground">{currentStep.prompt}</p>

        {isEmotionStep ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Negative
              </p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.negative.map((emotion) => (
                  <Badge
                    key={emotion}
                    variant={
                      data.cbtFeeling.includes(emotion) ? "default" : "outline"
                    }
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => selectEmotion(emotion)}
                  >
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Positive
              </p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.positive.map((emotion) => (
                  <Badge
                    key={emotion}
                    variant={
                      data.cbtFeeling.includes(emotion) ? "default" : "outline"
                    }
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => selectEmotion(emotion)}
                  >
                    {emotion}
                  </Badge>
                ))}
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
