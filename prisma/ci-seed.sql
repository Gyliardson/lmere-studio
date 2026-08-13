-- Deterministic PostgreSQL fixtures for disposable CI databases.

INSERT INTO "Tenant" ("id", "slug", "name", "adminPasswordHash", "maxOrdersPerDay", "minLeadDays", "featuresConfig", "createdAt", "updatedAt") VALUES
('ci-tenant-a', 'ci-tenant-a', 'CI Tenant A', '', 5, 3, '{"deposit_mode":"50_percent"}', TIMESTAMP '2026-01-01 00:00:00', TIMESTAMP '2026-01-01 00:00:00'),
('ci-tenant-b', 'ci-tenant-b', 'CI Tenant B', '', 2, 1, '{"deposit_mode":"fixed"}', TIMESTAMP '2026-01-01 00:00:00', TIMESTAMP '2026-01-01 00:00:00');

INSERT INTO "CakeSize" ("id", "tenantId", "name", "servings", "weightKg", "basePrice", "maxFillings", "sortOrder", "active") VALUES
('ci-size-a', 'ci-tenant-a', 'CI Size A', '10 pessoas', 1.5, 100.00, 2, 0, true),
('ci-size-b', 'ci-tenant-b', 'CI Size B', '8 pessoas', 1.0, 80.00, 1, 0, true);

INSERT INTO "CakeFlavor" ("id", "tenantId", "name", "type", "additionalPrice", "isSpecial", "imageUrl", "active", "sortOrder") VALUES
('ci-flavor-a', 'ci-tenant-a', 'CI Flavor A', 'MASSA', 0.00, false, '', true, 0),
('ci-filling-a', 'ci-tenant-a', 'CI Filling A', 'RECHEIO', 10.00, false, '', true, 0),
('ci-flavor-b', 'ci-tenant-b', 'CI Flavor B', 'MASSA', 5.00, false, '', true, 0),
('ci-filling-b', 'ci-tenant-b', 'CI Filling B', 'RECHEIO', 0.00, false, '', true, 0);

INSERT INTO "WorkSchedule" ("id", "tenantId", "dayOfWeek", "isOpen") VALUES
('ci-schedule-a', 'ci-tenant-a', 1, true),
('ci-schedule-b', 'ci-tenant-b', 1, true);

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Tenant" WHERE "id" IN ('ci-tenant-a', 'ci-tenant-b')) <> 2 THEN
    RAISE EXCEPTION 'CI seed verification failed: expected two tenants';
  END IF;
END
$$;
