-- PostgreSQL-backed assertions for the deterministic CI fixture.
-- Any violated invariant raises an exception and fails CI.

DO $$
DECLARE
  tenant_a_sizes INTEGER;
  tenant_b_sizes INTEGER;
  tenant_a_flavors INTEGER;
  tenant_b_flavors INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_a_sizes FROM "CakeSize" WHERE "tenantId" = 'ci-tenant-a';
  SELECT COUNT(*) INTO tenant_b_sizes FROM "CakeSize" WHERE "tenantId" = 'ci-tenant-b';
  SELECT COUNT(*) INTO tenant_a_flavors FROM "CakeFlavor" WHERE "tenantId" = 'ci-tenant-a';
  SELECT COUNT(*) INTO tenant_b_flavors FROM "CakeFlavor" WHERE "tenantId" = 'ci-tenant-b';

  IF tenant_a_sizes <> 1 OR tenant_b_sizes <> 1 THEN
    RAISE EXCEPTION 'Fixture isolation failed: expected one size per tenant';
  END IF;

  IF tenant_a_flavors <> 2 OR tenant_b_flavors <> 2 THEN
    RAISE EXCEPTION 'Fixture isolation failed: expected two flavors/fillings per tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CakeSize" a
    JOIN "CakeSize" b ON a."id" = b."id"
    WHERE a."tenantId" = 'ci-tenant-a' AND b."tenantId" = 'ci-tenant-b'
  ) THEN
    RAISE EXCEPTION 'Fixture isolation failed: resource IDs overlap across tenants';
  END IF;
END
$$;

-- Verify relational constraints are real rather than mocked.
DO $$
BEGIN
  BEGIN
    INSERT INTO "CakeSize" ("id", "tenantId", "name", "servings", "weightKg", "basePrice", "maxFillings", "sortOrder", "active")
    VALUES ('ci-invalid-size', 'ci-tenant-missing', 'Invalid', '1', 1, 1, 1, 0, true);
    RAISE EXCEPTION 'Expected foreign-key violation for missing tenant';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  IF EXISTS (SELECT 1 FROM "CakeSize" WHERE "id" = 'ci-invalid-size') THEN
    RAISE EXCEPTION 'Foreign-key negative-path assertion left invalid data behind';
  END IF;
END
$$;

-- Verify tenant/day uniqueness used by scheduling logic.
DO $$
BEGIN
  BEGIN
    INSERT INTO "WorkSchedule" ("id", "tenantId", "dayOfWeek", "isOpen")
    VALUES ('ci-duplicate-schedule', 'ci-tenant-a', 1, true);
    RAISE EXCEPTION 'Expected unique violation for duplicate tenant/day schedule';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  IF EXISTS (SELECT 1 FROM "WorkSchedule" WHERE "id" = 'ci-duplicate-schedule') THEN
    RAISE EXCEPTION 'Unique-constraint negative-path assertion left duplicate data behind';
  END IF;
END
$$;
