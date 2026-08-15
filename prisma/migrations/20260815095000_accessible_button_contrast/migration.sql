-- Primary CTA text is normal-sized white text, so built-in button colors must meet WCAG AA 4.5:1.
ALTER TABLE "Tenant" ALTER COLUMN "buttonColor" SET DEFAULT '#7C3AED';

-- Migrate only the exact historical built-in button colors. Arbitrary customer-defined colors are
-- intentionally not rewritten; the admin settings boundary now rejects unsafe values on save.
UPDATE "Tenant"
SET "buttonColor" = CASE "buttonColor"
  WHEN '#8B5CF6' THEN '#7C3AED'
  WHEN '#F43F5E' THEN '#E11D48'
  WHEN '#D97706' THEN '#B45309'
  WHEN '#10B981' THEN '#047857'
  WHEN '#3B82F6' THEN '#2563EB'
  WHEN '#6366F1' THEN '#4F46E5'
  ELSE "buttonColor"
END
WHERE "buttonColor" IN ('#8B5CF6', '#F43F5E', '#D97706', '#10B981', '#3B82F6', '#6366F1');
