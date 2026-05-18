<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# What this app is

**Sadhana** — a *one-percent-better-day* application. Small, consistent
improvement compounded over a lifetime; *sadhana* is the daily practice
you return to.

It is **not** a productivity app. **Not** a habit tracker. **Not** a
journal. **Not** a second brain. Those adjacent categories will fight
us if we copy their patterns uncritically.

The user comes here to do three things, in conversation with something
that feels like a friend (not a dashboard):

1. **Plan the day** — see today's active quest (one, sometimes two) and
   the disciplines running alongside.
2. **Work the practice** — log progress on quest milestones and
   discipline cadences as they happen.
3. **Reflect on what passed** — tally the day's acts (good / neutral /
   bad), leave a one-line summary, optionally talk to the Acharya.

**Counsel** — a friend in Krishna's persona — is one tap away anytime.

## Goal model

- **Quest** — sequential, achievement-oriented, finite. Has ordered
  milestones. *One active at a time* (settable to 2 or 3). Future-dated
  quests sit as `scheduled` and auto-promote.
- **Discipline** — recurring practice (daily / weekly / monthly), runs
  in parallel always, no milestones. The bedrock.
- **Tasks** — Eisenhower-classified, drag-sortable — belong to a
  milestone inside a quest, or directly to a discipline.

## Core tenets (non-negotiable)

- **Focus, not capacity** — the activation cap on quests is the single
  most opinionated thing in the app and must stay opinionated.
- **Practice, not progress** — disciplines are the bedrock; a user who
  walks away from quests but keeps disciplines is still using the app
  correctly.
- **Reflection, not metrics** — the day is closed by tallying lived
  acts, not by KPIs. Don't gamify the streak.
- **Friend, not tool** — Counsel speaks as Krishna: warm, direct,
  occasionally pointed, never saccharine. Never an "AI assistant."
- **No dump yard** — lists love to grow; the app's job is to keep the
  working set small enough that the user actually does it.
- **Sanskrit framing is texture, not gimmick** — vrata, mala, sadhana,
  viveka, sankalpa, prayaschitta carry philosophical weight that
  "habit" / "score" / "goal" don't. Use them when they add meaning;
  don't decorate.

If a proposed feature doesn't slot into the daily loop, or tensions
with a tenet, raise it before building. Full text and rationale live
in [docs/AGENDA.md](docs/AGENDA.md) — re-read it before non-trivial
work.

# Project agenda

The mission, tenets, and anti-patterns for this project live in
[docs/AGENDA.md](docs/AGENDA.md). Re-read it before any non-trivial
feature work and check the proposed change against it. When a
load-bearing decision is made in conversation, ask whether it
belongs in AGENDA.md before considering it settled.

# No env files with secrets

Do not read, open, grep, or write to `.env`, `.env.local`,
`.env.development`, `.env.dev`, `.env.production`, `.env.staging`, or
any sibling file that holds real secrets. That includes peeking at
them just to confirm a value exists. The only env file you are
allowed to touch is `.env.example` (and other clearly-named template
files that ship no real credentials).

If a task needs a new env var, describe the variable name, an
example value, and the file the user should add it to — then let the
user edit the secret-bearing file themselves. If you need to know
whether a variable is already set, ask the user; do not read or grep
the file to find out. The IDE showing a `.env.*` file as "opened"
does not constitute permission to read it.

# No git commands

Do not run any git commands. That includes `pull`, `push`, `commit`,
`merge`, `add`, `rebase`, `reset`, `checkout`, `stash`, `tag`, `branch`,
or anything else under `git`. The user runs all git operations
manually. Do not invoke commit/PR-related skills either.

# Stack conventions

These are the standing conventions for this codebase. If a request
appears to contradict one of them, pause and confirm the deviation
before proceeding — do not silently follow either path.

- **Data fetching:** TanStack Query (React Query). Do not introduce
  SWR or hand-rolled fetch hooks.
- **Optimistic updates:** Default to TanStack Query's optimistic
  update pattern wherever it suits the UX (list mutations, toggles,
  edits) — `onMutate` snapshot, rollback in `onError`, invalidate in
  `onSettled`. Skip only when the server produces values the client
  cannot reasonably predict.
- **Shared state:** Zustand. Do not add parallel context providers
  or hoist `useState` to a page/layout when state needs to be shared
  across components — put it in a Zustand store.
- **Local component state:** When a component genuinely needs local
  state with multiple related fields, prefer a single object state
  (`useState({ a, b, c })` or a reducer) over several `useState`
  calls.
- **Database:** Postgres (Neon) accessed via Drizzle ORM. **There is
  no Supabase in this project.** The Supabase→Neon/BetterAuth
  migration has shipped — any `@supabase/*` imports, Supabase client
  usage, RLS policies, or `auth.users` references are stale and must
  not be reintroduced. If something in the codebase still mentions
  Supabase, treat it as a leftover to remove, not as live
  infrastructure. Auth runs on BetterAuth, not Supabase Auth.
