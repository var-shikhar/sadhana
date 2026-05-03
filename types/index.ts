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
  // Legacy fields — preserved so the archive can render older reflections
  // that were written before the chip-bucket flow.
  quickTags: string[] | null;
  quickNote: string | null;
  cbtEvent: string | null;
  cbtThought: string | null;
  cbtFeeling: string | null;
  cbtReframe: string | null;
  // Chip-bucket flow:
  goodChips: string[] | null;
  badChips: string[] | null;
  neutralChips: string[] | null;
  chipDescriptions: Record<string, string> | null;
  daySummary: string | null;
  aiResponse: string | null;
  aiQuestion: string | null;
  userFollowup: string | null;
  aiFollowup: string | null;
  createdAt: string;
}

// ── Reflection Chips ──
export type ChipCategory = "good" | "bad" | "neutral";

export const CHIP_CATEGORY_ORDER: ChipCategory[] = ["good", "neutral", "bad"];

export const CHIP_CATEGORY_META: Record<
  ChipCategory,
  { label: string; sanskrit: string; gloss: string; tone: "sage" | "earth" | "saffron" }
> = {
  good:    { label: "Good",    sanskrit: "Punya",   gloss: "what nourished", tone: "sage" },
  neutral: { label: "Neutral", sanskrit: "Sakshi",  gloss: "what passed",    tone: "earth" },
  bad:     { label: "Bad",     sanskrit: "Klesha",  gloss: "what depleted",  tone: "saffron" },
};

export interface ReflectionChip {
  id: string;
  userId: string;
  name: string;
  category: ChipCategory;
  /** Optional act-group membership. null → "All / Global" (always visible). */
  groupId: string | null;
  sortOrder: number;
  isActive: boolean;
  lastUsedAt: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Act Groups ──
/**
 * An optional grouping for acts. Acts can belong to one group (or to none =
 * the implicit "All / Global" bucket). Toggling a group inactive hides every
 * act inside it from the reflect-page chip rail without deleting anything —
 * useful for project-specific act sets that come and go.
 */
export interface ActGroup {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

// ── Categories (Phase 1: areas of life the user wants to focus on) ──
export type CategoryColor =
  | "saffron"
  | "sage"
  | "indigo"
  | "earth"
  | "gold";

export const CATEGORY_COLORS: Array<{ value: CategoryColor; hex: string; label: string }> = [
  { value: "saffron", hex: "#c46a1f", label: "Saffron" },
  { value: "sage",    hex: "#7a8b5c", label: "Sage" },
  { value: "indigo",  hex: "#1a1235", label: "Indigo" },
  { value: "earth",   hex: "#5c4022", label: "Earth" },
  { value: "gold",    hex: "#d4a259", label: "Gold" },
];

/** A small, curated icon set so users don't get lost in emoji or icon-search overhead */
export const CATEGORY_ICONS = [
  "🪷", "🔥", "🌿", "🕉️", "📚",
  "💪", "🧘", "✍️", "🤝", "🌅",
  "🍃", "💼", "🎨", "🛌", "💧",
] as const;

export interface Category {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string;
  color: CategoryColor;
  priority: number;     // 1..5 — 1 is highest
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Starter categories the system suggests on first run. The user can adopt
 *  one or many, edit any, or skip and create their own. */
export const STARTER_CATEGORIES: Array<{
  title: string;
  description: string;
  icon: string;
  color: CategoryColor;
  priority: number;
}> = [
  {
    title: "Health",
    description: "Body, sleep, food, movement.",
    icon: "💪",
    color: "saffron",
    priority: 1,
  },
  {
    title: "Work / Craft",
    description: "Focus, output, learning your trade.",
    icon: "💼",
    color: "indigo",
    priority: 2,
  },
  {
    title: "Relationships",
    description: "Family, friends, presence with the people you love.",
    icon: "🤝",
    color: "sage",
    priority: 2,
  },
  {
    title: "Inner Practice",
    description: "Meditation, reflection, prayer — the inward turn.",
    icon: "🪷",
    color: "gold",
    priority: 1,
  },
  {
    title: "Rest / Play",
    description: "What restores you. Without this, the others crumble.",
    icon: "🌅",
    color: "earth",
    priority: 3,
  },
];

// ── Goals (Phase 2: specific things inside a category) ──
export type GoalShape = "daily" | "weekly" | "by_date";
export type GoalStatus = "active" | "paused" | "completed" | "abandoned";
export type GoalSource = "user" | "suggestion";

export const GOAL_SHAPE_DEFS: Array<{
  shape: GoalShape;
  label: string;
  description: string;
  example: string;
}> = [
  {
    shape: "daily",
    label: "Daily practice",
    description: "Something you do every day. Tracked as kept-or-not per day.",
    example: "Meditate 10 minutes",
  },
  {
    shape: "weekly",
    label: "Weekly target",
    description: "A count to hit each week. Resets every Monday.",
    example: "Exercise 3 times this week",
  },
  {
    shape: "by_date",
    label: "By-date goal",
    description: "A total to reach by a deadline. Counts up over time.",
    example: "Read 12 books by Dec 31",
  },
];

export interface Goal {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string | null;
  shape: GoalShape;
  weeklyTarget: number | null;
  totalTarget: number | null;
  deadlineDate: string | null;
  source: GoalSource;
  status: GoalStatus;
  startedDate: string;
  completedDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalLog {
  id: string;
  goalId: string;
  userId: string;
  date: string;
  value: number;
  note: string | null;
  loggedAt: string;
}

export interface GoalProgress {
  /** True if today's log exists with value > 0 (daily shape) */
  todayDone?: boolean;
  /** Consecutive days back from today where the goal was kept (daily shape) */
  streak?: number;
  /** Sum of this ISO week's logs (weekly shape) */
  weekTotal?: number;
  /** Sum of all logs (by_date shape) */
  totalSoFar?: number;
  /** Days remaining until deadline (by_date shape) */
  daysRemaining?: number;
  /** Whether the goal's target is met (computed per shape) */
  isMet: boolean;
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress;
}

/**
 * System-suggested starter goals keyed by **lowercased category title**.
 * The user picks any subset; adopted goals are created with source="suggestion".
 * For user-created categories that don't match a starter title, the
 * suggestions array will be empty and the user sees only the "make your own"
 * surface.
 */
export const GOAL_SUGGESTIONS: Record<
  string,
  Array<{
    title: string;
    description: string;
    shape: GoalShape;
    weeklyTarget?: number;
    totalTarget?: number;
    deadlineHint?: string; // human label e.g. "by year-end"
  }>
> = {
  health: [
    { title: "Drink 2L water", description: "Spread across the day", shape: "daily" },
    { title: "Sleep by 11pm", description: "Phone away by 10:30", shape: "daily" },
    { title: "Mindful breathing 5 min", description: "Slows the day down", shape: "daily" },
    { title: "Exercise", description: "Any form — walk, run, gym, yoga", shape: "weekly", weeklyTarget: 3 },
    { title: "Cook from scratch", description: "Real food. Skip ultraprocessed.", shape: "weekly", weeklyTarget: 4 },
  ],
  "work / craft": [
    { title: "Deep work block (90 min)", description: "Phone in another room", shape: "daily" },
    { title: "No phone, first hour", description: "The morning belongs to you", shape: "daily" },
    { title: "Ship one meaningful change", description: "Small or large — but real", shape: "weekly", weeklyTarget: 5 },
    { title: "Read one industry article", description: "Outside your bubble", shape: "weekly", weeklyTarget: 3 },
  ],
  relationships: [
    { title: "Express appreciation to one person", description: "By word, not text", shape: "daily" },
    { title: "Call family", description: "Voice, not chat", shape: "weekly", weeklyTarget: 2 },
    { title: "Phone-free meal", description: "With anyone, even alone", shape: "weekly", weeklyTarget: 5 },
  ],
  "inner practice": [
    { title: "Meditate 10 minutes", description: "Sit, breathe, return", shape: "daily" },
    { title: "Read 1 page of scripture", description: "Slowly. With attention.", shape: "daily" },
    { title: "Long sit (30+ min)", description: "Once a week", shape: "weekly", weeklyTarget: 1 },
    { title: "Read full Bhagavad Gita", description: "By a chosen date", shape: "by_date", totalTarget: 700, deadlineHint: "by year-end" },
  ],
  "rest / play": [
    { title: "30 minutes of unstructured time", description: "No phone. No goal.", shape: "daily" },
    { title: "One day of true rest", description: "No work. No screens (mostly).", shape: "weekly", weeklyTarget: 1 },
    { title: "Time outdoors", description: "Sun, trees, walking", shape: "weekly", weeklyTarget: 4 },
  ],
};

// ── Vrata (the active vow) ──
export type VrataLengthName =
  | "saptaha"
  | "trayivimshati"
  | "mandala"
  | "ashtottarashata";

export type VrataStatus = "active" | "completed" | "abandoned";

export const VRATA_LENGTHS: Array<{
  name: VrataLengthName;
  baseDays: number;
  english: string;
  description: string;
}> = [
  {
    name: "saptaha",
    baseDays: 7,
    english: "Seven Days",
    description: "A short vow — a fortnight's worth of resolve",
  },
  {
    name: "trayivimshati",
    baseDays: 21,
    english: "Twenty-one Days",
    description: "Long enough for a habit to take root",
  },
  {
    name: "mandala",
    baseDays: 40,
    english: "Forty Days",
    description: "The traditional mandala — long, focused practice",
  },
  {
    name: "ashtottarashata",
    baseDays: 108,
    english: "One Hundred Eight",
    description: "The full mala — a sustained discipline",
  },
];

export interface Vrata {
  id: string;
  userId: string;
  lengthName: VrataLengthName;
  baseDays: number;
  extensionDays: number;
  boundHabitIds: string[];
  sankalpa: string | null;
  startedDate: string;       // YYYY-MM-DD
  completedDate: string | null;
  abandonedDate: string | null;
  status: VrataStatus;
  createdAt: string;
}

export interface VrataSlip {
  id: string;
  vrataId: string;
  userId: string;
  date: string;
  reason: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface VrataState {
  active: Vrata | null;
  /** Days completed (where ALL bound habits were marked done) */
  daysCompleted: number;
  /** Total target = baseDays + extensionDays */
  daysTarget: number;
  /** Slip records */
  slips: VrataSlip[];
  /** History of completed/abandoned vratas */
  history: Vrata[];
  /** Unacknowledged slips — surface as prayaschitta banner */
  unacknowledgedSlips: VrataSlip[];
}

export interface MalaState {
  /** Total days walked across the lifetime of the account */
  totalDaysWalked: number;
  /** Most recent 27 days, oldest → newest, of the upamala */
  recent27: Array<"filled" | "slip" | "future">;
  /** Modulo 108 — beads filled in the current mala */
  currentMalaBeads: number;
}

export interface TapasState {
  /** 0..1 — how bright the flame is right now, derived from recent practice density */
  brightness: number;
  /** Last 7 days of completion (1.0 if all bound habits done that day, partial if some) */
  recent7: number[];
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
