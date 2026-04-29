"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type UserHabit } from "@/types";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { queryKeys } from "@/lib/query-keys";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { VastuGrid } from "@/components/ornament/VastuGrid";

async function fetchHabits(): Promise<UserHabit[]> {
  const res = await fetch("/api/user-habits");
  if (!res.ok) throw new Error("Failed to load habits");
  return res.json();
}

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const router = useRouter();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("21:00");

  const habitsQuery = useQuery({
    queryKey: queryKeys.habits(),
    queryFn: fetchHabits,
  });

  const archiveMutation = useMutation({
    mutationFn: async (userHabitId: string) => {
      const res = await fetch("/api/user-habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userHabitId, archive: true }),
      });
      if (!res.ok) throw new Error("Failed to archive habit");
    },
    onMutate: async (userHabitId) => {
      await qc.cancelQueries({ queryKey: queryKeys.habits() });
      const previous = qc.getQueryData<UserHabit[]>(queryKeys.habits());
      qc.setQueryData<UserHabit[]>(queryKeys.habits(), (old = []) =>
        old.filter((h) => h.id !== userHabitId)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.habits(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.habits() });
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setMorningTime(profile.morningReminderTime || "07:00");
      setEveningTime(profile.eveningReminderTime || "21:00");
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await authClient.getSession();
      if (!cancelled && session.data?.user) setEmail(session.data.user.email);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSaveProfile() {
    updateProfile.mutate({
      displayName,
      morningReminderTime: morningTime,
      eveningReminderTime: eveningTime,
    });
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  if (profileLoading) {
    return (
      <div className="space-y-4 py-2">
        <p className="font-lyric-italic text-earth-mid">Loading...</p>
      </div>
    );
  }

  const habits = habitsQuery.data ?? [];

  return (
    <div className="space-y-6 py-2 relative">
      <VastuGrid className="absolute -top-2 right-0 pointer-events-none" opacity={0.08} />

      <header className="text-center space-y-2 relative">
        <LabelTiny>The Practice</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Quiet adjustments.</h1>
      </header>

      <GoldRule width="section" />

      <section className="space-y-3">
        <LabelTiny className="block">Profile</LabelTiny>
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-ivory border-gold/40"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-ivory-deep border-gold/30" />
            </div>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      <section className="space-y-3">
        <LabelTiny className="block">Reminders</LabelTiny>
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="morning">Morning Reminder</Label>
              <Input
                id="morning"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="bg-ivory border-gold/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evening">Evening Reminder</Label>
              <Input
                id="evening"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="bg-ivory border-gold/40"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Schedule"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      <section className="space-y-3">
        <LabelTiny className="block">My Habits</LabelTiny>
        <Card className="bg-ivory-deep border-gold/40">
          <CardContent className="pt-6">
            {habits.length === 0 ? (
              <p className="font-lyric-italic text-sm text-earth-mid">No active habits.</p>
            ) : (
              <div className="space-y-3">
                {habits.map((h) => (
                  <div key={h.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-lyric text-base text-ink">{h.habit.name}</p>
                      {h.sankalpa && (
                        <p className="font-lyric-italic text-xs text-earth-deep mt-0.5">
                          {h.sankalpa}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate(h.id)}
                      disabled={archiveMutation.isPending}
                    >
                      Archive
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
