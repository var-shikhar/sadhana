"use client";

import { useState, useEffect, useCallback } from "react";
import { type UserHabit, type DailyLog } from "@/types";
import { todayDate } from "@/lib/utils";

export function useHabits() {
  const [userHabits, setUserHabits] = useState<UserHabit[]>([]);
  const [todayLogs, setTodayLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [habitsRes, logsRes] = await Promise.all([
      fetch("/api/user-habits"),
      fetch(`/api/logs?date=${todayDate()}`),
    ]);
    const habits = await habitsRes.json();
    const logs = await logsRes.json();
    setUserHabits(habits);
    setTodayLogs(logs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleHabit(userHabitId: string, completed: boolean) {
    setTodayLogs((prev) => {
      const existing = prev.find((l) => l.userHabitId === userHabitId);
      if (existing) {
        return prev.map((l) =>
          l.userHabitId === userHabitId ? { ...l, completed } : l
        );
      }
      return [
        ...prev,
        {
          id: "temp-" + userHabitId,
          userId: "",
          date: todayDate(),
          userHabitId,
          completed,
          note: null,
          loggedAt: new Date().toISOString(),
        },
      ];
    });

    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayDate(),
        userHabitId,
        completed,
      }),
    });
  }

  return { userHabits, todayLogs, loading, toggleHabit, refresh: fetchData };
}
