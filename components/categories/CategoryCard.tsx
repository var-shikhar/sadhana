"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { CATEGORY_COLORS } from "@/types";

interface CategoryCardProps {
  category: Category;
  /** Optional summary text — e.g. "3 goals · 2 active today". Shown under title. */
  summary?: string;
  className?: string;
}

const PRIORITY_LABEL: Record<number, string> = {
  1: "Highest",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

export function CategoryCard({ category, summary, className }: CategoryCardProps) {
  const colorHex =
    CATEGORY_COLORS.find((c) => c.value === category.color)?.hex ?? "#c46a1f";

  return (
    <Link href={`/categories/${category.id}`} className="block">
      <Card
        className={cn(
          "flex flex-row items-center gap-4 px-4 py-4 bg-ivory-deep border-gold/30 transition-all hover:border-saffron/60",
          className
        )}
      >
        <div
          aria-hidden
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${colorHex}1f`, border: `1.5px solid ${colorHex}` }}
        >
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-lyric text-lg text-ink leading-tight truncate">
              {category.title}
            </p>
            <span className="font-pressure-caps text-[9px]" style={{ color: colorHex }}>
              · {PRIORITY_LABEL[category.priority]}
            </span>
          </div>
          {category.description && (
            <p className="font-lyric-italic text-xs text-earth-deep mt-0.5 line-clamp-2">
              {category.description}
            </p>
          )}
          {summary && (
            <p className="text-[11px] text-earth-mid mt-1">{summary}</p>
          )}
        </div>
        <span
          aria-hidden
          className="text-earth-mid"
          style={{ fontSize: "20px" }}
        >
          ›
        </span>
      </Card>
    </Link>
  );
}
