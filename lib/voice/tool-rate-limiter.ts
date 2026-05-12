// In-memory per-callId rate limiter for the retrieve_scripture tool.
//
// Two rules:
//   - min interval between calls = 15s
//   - max calls per session = 8
//
// Tracked in a process-local Map. ACCEPTABLE FOR SINGLE-NODE DEPLOY ONLY.
// If this app ever scales out, this must move to a shared store (Redis,
// the existing Postgres). The constraint is documented inline; a runtime
// log fires on first use so the choice is visible.

const MIN_INTERVAL_MS = 15_000;
const MAX_CALLS = 8;

// We also expire entries after ~30 min so the map doesn't grow forever in
// a long-running server. Session-end normally clears the entry; this is a
// safety floor.
const EXPIRY_MS = 30 * 60 * 1000;

interface Entry {
  count: number;
  lastAt: number;
  createdAt: number;
}

const map = new Map<string, Entry>();

let warnedOnce = false;
function warnOnce() {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(
    "[voice/tool-rate-limiter] in-memory limiter active — single-node deploys only."
  );
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "min_interval" | "max_per_call" };

export function checkAndConsume(callId: string): RateLimitResult {
  warnOnce();
  const now = Date.now();

  // Sweep expired entries opportunistically.
  for (const [k, v] of map) {
    if (now - v.createdAt > EXPIRY_MS) map.delete(k);
  }

  const entry = map.get(callId);
  if (!entry) {
    map.set(callId, { count: 1, lastAt: now, createdAt: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_CALLS) {
    return { allowed: false, reason: "max_per_call" };
  }
  if (now - entry.lastAt < MIN_INTERVAL_MS) {
    return { allowed: false, reason: "min_interval" };
  }

  entry.count += 1;
  entry.lastAt = now;
  return { allowed: true };
}

/** Optional — call from /end to release memory promptly. */
export function release(callId: string) {
  map.delete(callId);
}
