-- ──────────────────────────────────────────────────────────────────────────
-- Categories — drop icon and priority columns
--
-- Categories are now bare labels: title, description, color, isActive.
-- Icons and priorities were UI noise that didn't earn their keep.
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE categories DROP COLUMN IF EXISTS icon;
ALTER TABLE categories DROP COLUMN IF EXISTS priority;
