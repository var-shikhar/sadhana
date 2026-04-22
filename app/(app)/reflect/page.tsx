"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { QuickMode } from "@/components/reflection/QuickMode";
import { DeepMode } from "@/components/reflection/DeepMode";
import { useReflection } from "@/hooks/useReflection";
import { todayDate } from "@/lib/utils";
import { type PitfallTag } from "@/types";

export default function ReflectPage() {
  const { reflection, loading } = useReflection();
  const [submitted, setSubmitted] = useState(false);

  async function handleQuickSubmit(tags: PitfallTag[], note: string) {
    await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayDate(),
        mode: "quick",
        quickTags: tags,
        quickNote: note || null,
      }),
    });
    setSubmitted(true);
  }

  async function handleDeepSubmit(data: {
    cbtEvent: string;
    cbtThought: string;
    cbtFeeling: string;
    cbtReframe: string;
  }) {
    await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayDate(),
        mode: "deep",
        ...data,
      }),
    });
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Svadhyaya</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (submitted || reflection) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Svadhyaya</h1>
        <Card className="p-6 text-center">
          <p className="text-lg font-medium">
            Today&apos;s reflection is complete.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {reflection?.mode === "deep" || (!reflection && !submitted)
              ? "Deep reflection — 25 pts"
              : "Quick reflection — 15 pts"}
          </p>
          <p className="mt-4 text-sm italic text-muted-foreground">
            &quot;Svadhyaya — the practice of self-study — is complete for today.&quot;
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Svadhyaya</h1>
        <p className="text-sm text-muted-foreground">
          Daily self-reflection. Quick or deep — both count.
        </p>
      </div>

      <Tabs defaultValue="quick">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick">Quick (15 pts)</TabsTrigger>
          <TabsTrigger value="deep">Deep (25 pts)</TabsTrigger>
        </TabsList>
        <TabsContent value="quick" className="mt-4">
          <QuickMode onSubmit={handleQuickSubmit} />
        </TabsContent>
        <TabsContent value="deep" className="mt-4">
          <DeepMode onSubmit={handleDeepSubmit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
