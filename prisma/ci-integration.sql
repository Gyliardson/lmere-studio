-- PostgreSQL-backed assertions for the deterministic CI fixture.
-- Any violated invariant raises an exception and fails CI.

DO $$
DECLARE
  tenant_a_sizes INTEGER;
  tenant_b_sizes INTEGER;
  tenant_a_flavors INTEGER;
  tenant_b_flavors INTEGER;
  tenant_a_addons INTEGER;
  tenant_b_addons INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_a_sizes FROM "CakeSize" WHERE "tenantId" = 'ci-tenant-a';
  SELECT COUNT(*) INTO tenant_b_sizes FROM "CakeSize" WHERE "tenantId" = 'ci-tenant-b';
  SELECT COUNT(*) INTO tenant_a_flavors FROM "CakeFlavor" WHERE "tenantId" = 'ci-tenant-a';
  SELECT COUNT(*) INTO tenant_b_flavors FROM "CakeFlavor" WHERE "tenantId" = 'ci-tenant-b';
  SELECT COUNT(*) INTO tenant_a_addons FROM "Addon" WHERE "tenantId" = 'ci-tenant-a';
  SELECT COUNT(*) INTO tenant_b_addons FROM "Addon" WHERE "tenantId" = 'ci-tenant-b';

  IF tenant_a_sizes <> 2 OR tenant_b_sizes <> 1 THEN
    RAISE EXCEPTION 'Fixture isolation failed: unexpected tenant size counts';
  END IF;

  IF tenant_a_flavors <> 4 OR tenant_b_flavors <> 2 THEN
    RAISE EXCEPTION 'Fixture isolation failed: unexpected tenant flavor/filling counts';
  END IF;

  IF tenant_a_addons <> 1 OR tenant_b_addons <> 1 THEN
    RAISE EXCEPTION 'Fixture isolation failed: unexpected tenant addon counts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CakeSize" a
    JOIN "CakeSize" b ON a."id" = b."id"
    WHERE a."tenantId" = 'ci-tenant-a' AND b."tenantId" = 'ci-tenant-b'
  ) THEN
    RAISE EXCEPTION 'Fixture isolation failed: resource IDs overlap across tenants';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CakeFlavor" a
    JOIN "CakeFlavor" b ON a."id" = b."id"
    WHERE a."tenantId" = 'ci-tenant-a' AND b."tenantId" = 'ci-tenant-b'
  ) THEN
    RAISE EXCEPTION 'Fixture isolation failed: flavor IDs overlap across tenants';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Addon" a
    JOIN "Addon" b ON a."id" = b."id"
    WHERE a."tenantId" = 'ci-tenant-a' AND b."tenantId" = 'ci-tenant-b'
  ) THEN
    RAISE EXCEPTION 'Fixture isolation failed: addon IDs overlap across tenants';
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

-- Verify the database-level default itself produces the complete public feature contract.
DO $$
DECLARE
  config JSONB;
BEGIN
  INSERT INTO "Tenant" ("id", "slug", "name", "createdAt", "updatedAt")
  VALUES ('ci-default-contract', 'ci-default-contract', 'CI Default Contract', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  SELECT "featuresConfig"::jsonb INTO config
  FROM "Tenant"
  WHERE "id" = 'ci-default-contract';

  IF config <> '{"allow_photo_upload":true,"deposit_mode":"50_percent","enable_delivery_step":false,"custom_fields":[]}'::jsonb THEN
    RAISE EXCEPTION 'Tenant featuresConfig database default does not match the authoritative contract';
  END IF;

  DELETE FROM "Tenant" WHERE "id" = 'ci-default-contract';
END
$$;
