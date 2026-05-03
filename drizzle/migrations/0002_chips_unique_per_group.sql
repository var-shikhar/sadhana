-- ──────────────────────────────────────────────────────────────────────────
-- Reflection chips — uniqueness scoped per group.
--
-- Previously (user_id, name) was unique, which meant the same act name could
-- only exist once per user — even across different groups. Adding the same
-- act in another group silently moved the existing row instead of creating a
-- second one.
--
-- New rule: (user_id, name, group_id) is unique, with NULLS NOT DISTINCT so
-- the implicit "All / Global" bucket (group_id IS NULL) also enforces
-- name-uniqueness within itself.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE reflection_chips
  DROP CONSTRAINT IF EXISTS reflection_chips_user_name_unique;

ALTER TABLE reflection_chips
  ADD CONSTRAINT reflection_chips_user_name_group_unique
  UNIQUE NULLS NOT DISTINCT (user_id, name, group_id);
