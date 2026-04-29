"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { type Profile, type UserHabit } from "@/types";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { VastuGrid } from "@/components/ornament/VastuGrid";

export default function SettingsPage() {
  const [, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("21:00");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [profileRes, habitsRes, sessionRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/user-habits"),
        authClient.getSession(),
      ]);
      const profileData = await profileRes.json();
      const habitsData = await habitsRes.json();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.displayName);
        setMorningTime(profileData.morningReminderTime || "07:00");
        setEveningTime(profileData.eveningReminderTime || "21:00");
      }
      if (sessionRes.data?.user) setEmail(sessionRes.data.user.email);
      setHabits(habitsData);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        morningReminderTime: morningTime,
        eveningReminderTime: eveningTime,
      }),
    });
    setSaving(false);
  }

  async function archiveHabit(userHabitId: string) {
    await fetch("/api/user-habits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userHabitId, archive: true }),
    });
    setHabits((prev) => prev.filter((h) => h.id !== userHabitId));
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <p className="font-lyric-italic text-earth-mid">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2 relative">
      <VastuGrid className="absolute -top-2 right-0 pointer-events-none" opacity={0.08} />

      <header className="text-center space-y-2 relative">
        <LabelTiny>The Practice</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Quiet adjustments.</h1>
      </header>

      <GoldRule width="section" />

      {/* Profile */}
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
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      {/* Notification Schedule */}
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
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Schedule"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <GoldRule width="section" />

      {/* My Habits */}
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
                    <Button variant="outline" size="sm" onClick={() => archiveHabit(h.id)}>
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
