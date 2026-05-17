"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button, ButtonBare } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type UserHabit } from "@/types";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { queryKeys } from "@/lib/query-keys";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { Loader } from "@/components/gurukul/Loader";
import { cn } from "@/lib/utils";

async function fetchHabits(): Promise<UserHabit[]> {
  const res = await fetch("/api/user-habits");
  if (!res.ok) throw new Error("Failed to load habits");
  return res.json();
}

type EditField = "displayName" | "morning" | "evening" | null;

const FIELD_META: Record<
  Exclude<EditField, null>,
  { title: string; subtitle: string; type: "text" | "time" }
> = {
  displayName: {
    title: "Display name",
    subtitle: "How you appear in the app.",
    type: "text",
  },
  morning: {
    title: "Morning reminder",
    subtitle: "When to nudge you to begin the day.",
    type: "time",
  },
  evening: {
    title: "Evening reminder",
    subtitle: "When to nudge you to reflect.",
    type: "time",
  },
};

export default function ProfileSettingsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<EditField>(null);
  const [draft, setDraft] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

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
    let cancelled = false;
    (async () => {
      const session = await authClient.getSession();
      if (!cancelled && session.data?.user) setEmail(session.data.user.email);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lock body scroll while edit modal is open.
  useEffect(() => {
    if (editing === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editing]);

  const displayName = profile?.displayName ?? "";
  const morningTime = profile?.morningReminderTime || "07:00";
  const eveningTime = profile?.eveningReminderTime || "21:00";

  const habits = habitsQuery.data ?? [];

  const meta = useMemo(() => (editing ? FIELD_META[editing] : null), [editing]);

  function openEdit(field: Exclude<EditField, null>) {
    if (!profile) return;
    setSaveError(null);
    if (field === "displayName") setDraft(displayName);
    else if (field === "morning") setDraft(morningTime);
    else setDraft(eveningTime);
    setEditing(field);
  }

  function closeEdit() {
    setEditing(null);
    setSaveError(null);
  }

  async function commitEdit() {
    if (!editing) return;
    const value = draft.trim();
    if (!value) {
      setSaveError("This can't be empty.");
      return;
    }

    const patch =
      editing === "displayName"
        ? { displayName: value }
        : editing === "morning"
          ? { morningReminderTime: value }
          : { eveningReminderTime: value };

    try {
      await updateProfile.mutateAsync(patch);
      closeEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save");
    }
  }

  if (profileLoading) {
    return <Loader fullScreen caption="drawing your profile…" />;
  }

  return (
    <div className="space-y-6 py-2 relative">
      <header className="text-center space-y-2 relative">
        <LabelTiny>The Practice</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Profile.</h1>
      </header>

      <GoldRule width="section" />

      {/* ── Identity ── */}
      <section className="space-y-2">
        <LabelTiny className="block">Identity</LabelTiny>
        <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
          <SettingRow
            label="Display name"
            value={displayName || "—"}
            onClick={() => openEdit("displayName")}
          />
          <SettingRow label="Email" value={email || "—"} disabled />
        </ul>
      </section>

      {/* ── Reminders ── */}
      <section className="space-y-2">
        <LabelTiny className="block">Reminders</LabelTiny>
        <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
          <SettingRow
            label="Morning reminder"
            value={morningTime}
            onClick={() => openEdit("morning")}
          />
          <SettingRow
            label="Evening reminder"
            value={eveningTime}
            onClick={() => openEdit("evening")}
          />
        </ul>
      </section>

      {/* ── Practice — quest concurrency ──
          The single most opinionated setting in the app. Default of 1
          gives the quest model its meaning; 2 or 3 trade focus for
          parallel pursuit. */}
      <section className="space-y-2">
        <LabelTiny className="block">Practice</LabelTiny>
        <div className="rounded-md border border-gold/30 bg-ivory-deep p-4 space-y-3">
          <div className="space-y-0.5">
            <p className="font-lyric text-[14px] text-ink">
              Active quests at once
            </p>
            <p className="font-lyric-italic text-[11px] text-earth-mid">
              The default — one — keeps your focus single-pointed. Two or
              three lets parallel quests run, at the cost of attention.
              Disciplines aren&apos;t affected; they always run together.
            </p>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => {
              const active = (profile?.maxActiveQuests ?? 1) === n
              return (
                <ButtonBare
                  key={n}
                  type="button"
                  onClick={() =>
                    void updateProfile.mutateAsync({ maxActiveQuests: n })
                  }
                  disabled={updateProfile.isPending || active}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-center transition-colors",
                    active
                      ? "bg-ink text-ivory border-ink"
                      : "bg-ivory text-earth-deep border-gold/40 hover:bg-ivory-deep",
                  )}
                >
                  <span className="font-lyric text-[18px] block leading-none">
                    {n}
                  </span>
                  <span
                    className={cn(
                      "font-pressure-caps text-[9px] tracking-wider",
                      active ? "text-ivory/80" : "text-earth-mid",
                    )}
                  >
                    {n === 1 ? "focused" : n === 2 ? "split" : "scattered"}
                  </span>
                </ButtonBare>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Habits ── */}
      <section className="space-y-2">
        <LabelTiny className="block">Habits</LabelTiny>
        <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
          {habits.length === 0 ? (
            <li className="px-4 py-4 text-center">
              <p className="font-lyric-italic text-sm text-earth-mid">
                No active habits.
              </p>
            </li>
          ) : (
            habits.map((h) => (
              <li
                key={h.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-lyric text-[14px] text-ink truncate">
                    {h.habit.name}
                  </p>
                  {h.sankalpa && (
                    <p className="font-lyric-italic text-[11px] text-earth-mid mt-0.5 truncate">
                      {h.sankalpa}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveMutation.mutate(h.id)}
                  disabled={archiveMutation.isPending}
                  className="shrink-0"
                >
                  Archive
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <GoldRule width="section" />

      <Link
        href="/settings"
        className="block text-center font-pressure-caps text-[10px] text-earth-mid hover:text-earth-deep"
      >
        ← back to settings
      </Link>

      {editing !== null &&
        meta &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={closeEdit}
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center sm:px-4 bg-ink/55 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label={meta.title}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-gold/40 bg-ivory-deep p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
            >
              <div className="space-y-1">
                <h3 className="font-pressure-caps text-[11px] tracking-[2px] text-earth-deep">
                  {meta.title}
                </h3>
                <p className="font-lyric-italic text-[11px] text-earth-mid">
                  {meta.subtitle}
                </p>
              </div>

              <Input
                autoFocus
                type={meta.type}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaveError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitEdit();
                  if (e.key === "Escape") closeEdit();
                }}
                className="bg-ivory border-gold/40"
              />

              {saveError && (
                <p className="text-[11px] text-saffron font-lyric-italic">
                  {saveError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <ButtonBare
                  type="button"
                  onClick={closeEdit}
                  disabled={updateProfile.isPending}
                  className="text-[10px] font-pressure-caps tracking-wider text-earth-mid hover:text-earth-deep px-3 py-1.5"
                >
                  Cancel
                </ButtonBare>
                <ButtonBare
                  type="button"
                  onClick={() => void commitEdit()}
                  disabled={updateProfile.isPending || !draft.trim()}
                  className="text-[10px] font-pressure-caps tracking-wider bg-ink text-ivory rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {updateProfile.isPending ? "Saving…" : "Save"}
                </ButtonBare>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function SettingRow({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="font-lyric text-[14px] text-ink shrink-0">{label}</span>
      <span
        className={cn(
          "ml-auto font-sans text-[13px] truncate text-right",
          disabled ? "text-earth-mid" : "text-saffron",
        )}
      >
        {value}
      </span>
      {!disabled && (
        <span
          aria-hidden="true"
          className="font-pressure-caps text-[14px] text-earth-mid/60 shrink-0"
        >
          ›
        </span>
      )}
    </div>
  );

  if (disabled || !onClick) {
    return <li className="opacity-80">{inner}</li>;
  }

  return (
    <li className="hover:bg-ivory transition-colors">
      <ButtonBare
        type="button"
        onClick={onClick}
        className="w-full text-left"
        aria-label={`Edit ${label}`}
      >
        {inner}
      </ButtonBare>
    </li>
  );
}
