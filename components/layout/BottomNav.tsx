"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/categories", label: "Plan", icon: "grid" },
  { href: "/counsel", label: "Counsel", icon: "lotus" },
  { href: "/reflect", label: "Reflect", icon: "feather" },
  { href: "/analytics", label: "Viveka", icon: "bar-chart-2" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "text-saffron" : "text-earth-mid";

  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
    "check-square": (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m-6 8h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    feather: (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5l6.74-6.76zM16 8L2 22M17.5 15H9" />
      </svg>
    ),
    "bar-chart-2": (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    settings: (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    book: (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4V4zm16 0h-7a3 3 0 00-3 3v13a2 2 0 012-2h8V4z" />
      </svg>
    ),
    lotus: (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 c-2 4 -2 7 0 10 c2 -3 2 -6 0 -10 z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 9 c1 4 4 5 7 4 c-1 -3 -4 -5 -7 -4 z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9 c-1 4 -4 5 -7 4 c1 -3 4 -5 7 -4 z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 14 c2 4 6 5 9 4 c-1 -3 -5 -5 -9 -4 z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 14 c-2 4 -6 5 -9 4 c1 -3 5 -5 9 -4 z" />
      </svg>
    ),
    grid: (
      <svg className={cn("h-5 w-5", color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  };

  return <>{icons[name]}</>;
}

/** Routes that take over the full viewport and should not show BottomNav. */
const HIDE_NAV_ROUTES = ["/counsel"];

export function BottomNav() {
  const pathname = usePathname();

  // Counsel is a full-screen dark takeover — the nav at the bottom would
  // visually cover the chat composer at the same z-index.
  if (HIDE_NAV_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/40 bg-ivory/95 backdrop-blur supports-backdrop-filter:bg-ivory/80">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
                active ? "text-saffron" : "text-earth-mid"
              )}
            >
              <NavIcon name={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
