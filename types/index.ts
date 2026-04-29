// ── PERMA Pillars ──
export type PermaPillar = "P" | "E" | "R" | "M" | "A";

export const PERMA_LABELS: Record<PermaPillar, string> = {
  P: "Positive Emotion",
  E: "Engagement",
  R: "Relationships",
  M: "Meaning",
  A: "Achievement",
};

export const PERMA_DESCRIPTIONS: Record<PermaPillar, string> = {
  P: "Gratitude, joy, and positive experiences",
  E: "Deep focus, flow states, and presence",
  R: "Connection, love, and meaningful bonds",
  M: "Purpose, spirituality, and values",
  A: "Growth, accomplishment, and mastery",
};

// ── Days of Week ──
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const ALL_DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// ── Habits ──
export interface Habit {
  id: string;
  name: string;
  category: string;
  permaPillar: PermaPillar | null;
  icon: string | null;
  isAvoid: boolean;
  isPreset: boolean;
  createdBy: string | null;
  isActive: boolean;
}

export interface UserHabit {
  id: string;
  userId: string;
  habitId: string;
  habit: Habit;
  sankalpa: string | null;
  targetDays: DayOfWeek[];
  createdAt: string;
  archivedAt: string | null;
}

// ── Daily Log ──
export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  userHabitId: string;
  completed: boolean;
  note: string | null;
  loggedAt: string;
}

// ── Reflection ──
export type ReflectionMode = "quick" | "deep";

export const PITFALL_TAGS = [
  "Procrastinated",
  "Poor sleep",
  "Distracted",
  "Emotional eating",
  "Argued",
  "Skipped workout",
  "Doom-scrolled",
  "Negative self-talk",
  "Overwhelmed",
  "Isolated",
] as const;

export type PitfallTag = (typeof PITFALL_TAGS)[number];

export const PITFALL_TAG_FAMILIES = {
  Restraint: [
    "Procrastinated",
    "Distracted",
    "Emotional eating",
    "Doom-scrolled",
    "Skipped workout",
  ],
  Mind: [
    "Poor sleep",
    "Argued",
    "Negative self-talk",
    "Overwhelmed",
    "Isolated",
  ],
} as const satisfies Record<string, readonly PitfallTag[]>;

export type PitfallFamily = keyof typeof PITFALL_TAG_FAMILIES;

export function familyForTag(tag: PitfallTag): PitfallFamily {
  if ((PITFALL_TAG_FAMILIES.Restraint as readonly string[]).includes(tag)) return "Restraint";
  return "Mind";
}

export const EMOTIONS = {
  negative: [
    "Anxious", "Angry", "Sad", "Frustrated", "Ashamed", "Guilty",
    "Lonely", "Jealous", "Overwhelmed", "Hopeless", "Resentful", "Disgusted",
  ],
  positive: [
    "Grateful", "Proud", "Calm", "Hopeful", "Joyful", "Loved",
    "Confident", "Curious", "Amused", "Relieved", "Inspired", "Content",
  ],
} as const;

export type Emotion =
  | (typeof EMOTIONS.negative)[number]
  | (typeof EMOTIONS.positive)[number];

export interface Reflection {
  id: string;
  userId: string;
  date: string;
  mode: ReflectionMode;
  quickTags: string[] | null;
  quickNote: string | null;
  cbtEvent: string | null;
  cbtThought: string | null;
  cbtFeeling: string | null;
  cbtReframe: string | null;
  aiResponse: string | null;
  aiQuestion: string | null;
  userFollowup: string | null;
  aiFollowup: string | null;
  createdAt: string;
}

// ── Growth Scores ──
export interface GrowthScore {
  id: string;
  userId: string;
  date: string;
  completionPts: number;
  reflectionPts: number;
  consistencyPts: number;
  dailyScore: number;
  indexValue: number;
}

export const GROWTH_LEVELS = [
  { min: 100, max: 200, label: "Beginning your Sadhana" },
  { min: 200, max: 500, label: "Building momentum" },
  { min: 500, max: 1000, label: "Consistent practitioner" },
  { min: 1000, max: Infinity, label: "Dedicated sadhak" },
] as const;

export function getGrowthLevel(index: number): string {
  const level = GROWTH_LEVELS.find((l) => index >= l.min && index < l.max);
  return level?.label ?? "Beginning your Sadhana";
}

// ── Profile ──
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  onboardingCompleted: boolean;
  morningReminderTime: string;
  eveningReminderTime: string;
}

// ── Preset Habits Data ──
export const PRESET_HABITS: Array<{
  name: string;
  category: string;
  permaPillar: PermaPillar;
  icon: string;
}> = [
  // P — Positive Emotion
  { name: "Gratitude journaling", category: "Positive Emotion", permaPillar: "P", icon: "pen-line" },
  { name: "Mindful breathing", category: "Positive Emotion", permaPillar: "P", icon: "wind" },
  { name: "Screen-free morning", category: "Positive Emotion", permaPillar: "P", icon: "sunrise" },
  { name: "Cold shower", category: "Positive Emotion", permaPillar: "P", icon: "droplets" },
  { name: "Smile/laugh intentionally", category: "Positive Emotion", permaPillar: "P", icon: "smile" },
  // E — Engagement
  { name: "Deep work block (90 min)", category: "Engagement", permaPillar: "E", icon: "brain" },
  { name: "Read 20 pages", category: "Engagement", permaPillar: "E", icon: "book-open" },
  { name: "Learn something new", category: "Engagement", permaPillar: "E", icon: "lightbulb" },
  { name: "Creative practice", category: "Engagement", permaPillar: "E", icon: "palette" },
  { name: "No phone during meals", category: "Engagement", permaPillar: "E", icon: "utensils" },
  // R — Relationships
  { name: "Meaningful conversation", category: "Relationships", permaPillar: "R", icon: "message-circle" },
  { name: "Call family", category: "Relationships", permaPillar: "R", icon: "phone" },
  { name: "Express appreciation", category: "Relationships", permaPillar: "R", icon: "heart" },
  { name: "Help someone", category: "Relationships", permaPillar: "R", icon: "hand-helping" },
  { name: "Quality time (no screens)", category: "Relationships", permaPillar: "R", icon: "users" },
  // M — Meaning
  { name: "Meditation", category: "Meaning", permaPillar: "M", icon: "flame" },
  { name: "Prayer/reflection", category: "Meaning", permaPillar: "M", icon: "sparkles" },
  { name: "Journal entry", category: "Meaning", permaPillar: "M", icon: "notebook-pen" },
  { name: "Volunteer", category: "Meaning", permaPillar: "M", icon: "hand-heart" },
  { name: "Align action with values", category: "Meaning", permaPillar: "M", icon: "compass" },
  // A — Achievement
  { name: "Exercise (any form)", category: "Achievement", permaPillar: "A", icon: "dumbbell" },
  { name: "Skill practice", category: "Achievement", permaPillar: "A", icon: "target" },
  { name: "Project progress", category: "Achievement", permaPillar: "A", icon: "trending-up" },
  { name: "Complete MIT", category: "Achievement", permaPillar: "A", icon: "check-circle" },
  { name: "Learn a new word/concept", category: "Achievement", permaPillar: "A", icon: "graduation-cap" },
];

export const AVOID_HABITS: Array<{
  name: string;
  icon: string;
}> = [
  { name: "No alcohol", icon: "wine-off" },
  { name: "No smoking", icon: "cigarette-off" },
  { name: "No doom-scrolling", icon: "smartphone-off" },
  { name: "No late sleep (after midnight)", icon: "moon-off" },
  { name: "No junk food", icon: "pizza-off" },
  { name: "No anger outburst", icon: "flame-off" },
  { name: "No procrastination on MIT", icon: "timer-off" },
];
