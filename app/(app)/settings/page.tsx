"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { type Profile, type UserHabit } from "@/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("21:00");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [profileRes, habitsRes, { data: { user } }] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/user-habits"),
        supabase.auth.getUser(),
      ]);
      const profileData = await profileRes.json();
      const habitsData = await habitsRes.json();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.displayName);
        setMorningTime(profileData.morningReminderTime || "07:00");
        setEveningTime(profileData.eveningReminderTime || "21:00");
      }
      if (user) setEmail(user.email || "");
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
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notification Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="morning">Morning Reminder</Label>
            <Input
              id="morning"
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evening">Evening Reminder</Label>
            <Input
              id="evening"
              type="time"
              value={eveningTime}
              onChange={(e) => setEveningTime(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        </CardContent>
      </Card>

      {/* My Habits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">My Habits</CardTitle>
        </CardHeader>
        <CardContent>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active habits.</p>
          ) : (
            <div className="space-y-3">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{h.habit.name}</p>
                    {h.sankalpa && (
                      <p className="text-xs text-muted-foreground italic">{h.sankalpa}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveHabit(h.id)}
                  >
                    Archive
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Sign Out */}
      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
