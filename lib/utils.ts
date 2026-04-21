import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, eachDayOfInterval, subDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function dayOfWeek(): string {
  return format(new Date(), "EEE").toLowerCase();
}

export function last7Days(): string[] {
  const today = new Date();
  return eachDayOfInterval({
    start: subDays(today, 6),
    end: today,
  }).map((d) => format(d, "yyyy-MM-dd"));
}
