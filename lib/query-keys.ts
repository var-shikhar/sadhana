/**
 * Centralized TanStack Query cache keys.
 *
 * Convention: factory functions returning readonly tuples. The first segment
 * is the resource name; downstream segments narrow the key. This makes
 * partial-prefix invalidations work cleanly:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.reflections() })
 * invalidates every reflection-shaped cache entry.
 */
export const queryKeys = {
  habits: () => ["habits"] as const,
  todayLogs: (date: string) => ["logs", date] as const,

  reflections: () => ["reflections"] as const,
  reflectionByDate: (date: string) => ["reflections", "byDate", date] as const,
  archive: () => ["reflections", "archive"] as const,

  reflectionChips: () => ["reflection-chips"] as const,
  actGroups: () => ["act-groups"] as const,

  growthCurrent: () => ["growth", "current"] as const,
  growthHistory: (from: string, to: string) =>
    ["growth", "history", from, to] as const,

  profile: () => ["profile"] as const,

  vrata: () => ["vrata"] as const,
  mala: () => ["mala"] as const,

  categories: () => ["categories"] as const,
  category: (id: string) => ["categories", id] as const,

  goals: () => ["goals"] as const,
  goalsByCategory: (categoryId: string) => ["goals", "category", categoryId] as const,
  goal: (id: string) => ["goals", "id", id] as const,
  goalSuggestions: (categoryTitle: string) =>
    ["goalSuggestions", categoryTitle.toLowerCase()] as const,

  todayGoals: () => ["today", "goals"] as const,
  prompts: () => ["prompts"] as const,
  week: () => ["week"] as const,
};
