"use client";

import { Card } from "@/components/ui/card";
import { ButtonBare } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { CATEGORY_COLORS } from "@/types";

interface CategoryCardProps {
  category: Category;
  /** Optional summary text — e.g. "3 goals · 2 active today". */
  summary?: string;
  /** When provided, the whole card becomes a tap target. */
  onClick?: () => void;
  className?: string;
}

export function CategoryCard({
  category,
  summary,
  onClick,
  className,
}: CategoryCardProps) {
  const colorHex =
    CATEGORY_COLORS.find((c) => c.value === category.color)?.hex ??
    "var(--saffron)";

  const inner = (
    <div className="flex flex-row items-center gap-3">
      <span
        aria-hidden
        className="w-2 h-10 rounded-full shrink-0"
        style={{ backgroundColor: colorHex }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-lyric text-lg text-ink leading-tight truncate">
          {category.title}
        </p>
        {category.description && (
          <p className="font-lyric-italic text-xs text-earth-deep mt-0.5 line-clamp-2">
            {category.description}
          </p>
        )}
        {summary && (
          <p className="text-[11px] text-earth-mid mt-1">{summary}</p>
        )}
      </div>
    </div>
  );

  const cardCls = cn(
    "px-4 py-4 bg-ivory-deep border-gold/30 transition-all",
    onClick && "hover:border-saffron/60 cursor-pointer",
    className,
  );

  if (onClick) {
    return (
      <ButtonBare
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        aria-label={`Edit ${category.title}`}
      >
        <Card className={cardCls}>{inner}</Card>
      </ButtonBare>
    );
  }

  return <Card className={cardCls}>{inner}</Card>;
}
