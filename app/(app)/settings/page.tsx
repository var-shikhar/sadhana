"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { LabelTiny } from "@/components/gurukul/LabelTiny";
import { GoldRule } from "@/components/gurukul/GoldRule";
import { VastuGrid } from "@/components/ornament/VastuGrid";

const SETTINGS_ITEMS: Array<{
  href: string;
  label: string;
  description: string;
}> = [
  {
    href: "/settings/profile",
    label: "Profile",
    description: "Display name, reminders, and your habits.",
  },
  {
    href: "/settings/reflection-chips",
    label: "Acts",
    description: "The repeating things you tally on the Reflect tab.",
  },
  {
    href: "/settings/affirmations",
    label: "Affirmations",
    description: "Short statements you choose to revisit.",
  },
  {
    href: "/categories",
    label: "Goal Categories",
    description: "Optional labels for grouping your goals.",
  },
];

export default function SettingsPage() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6 py-2 relative">
      <VastuGrid
        className="absolute -top-2 right-0 pointer-events-none"
        opacity={0.08}
      />

      <header className="text-center space-y-2 relative">
        <LabelTiny>The Practice</LabelTiny>
        <h1 className="font-lyric text-3xl text-ink">Quiet adjustments.</h1>
      </header>

      <GoldRule width="section" />

      <ul className="rounded-md border border-gold/30 bg-ivory-deep divide-y divide-gold/20 overflow-hidden">
        {SETTINGS_ITEMS.map((item) => (
          <li key={item.href} className="group hover:bg-ivory transition-colors">
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-4"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-lyric text-[16px] text-ink">{item.label}</p>
                <p className="font-lyric-italic text-[12px] text-earth-mid">
                  {item.description}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="font-pressure-caps text-[14px] text-earth-mid/60 group-hover:text-earth-deep transition-colors shrink-0"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <GoldRule width="section" />

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
