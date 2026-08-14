-- Deterministic PostgreSQL fixtures for disposable CI databases.
-- The fixed bcrypt hash below is test-only and corresponds to the synthetic CI password
-- `ci-admin-password`. It must never be reused for a real tenant or production deployment.

INSERT INTO "Tenant" ("id", "slug", "name", "adminPasswordHash", "maxOrdersPerDay", "minLeadDays", "featuresConfig", "createdAt", "updatedAt") VALUES
('ci-tenant-a', 'ci-tenant-a', 'CI Tenant A', '$2b$10$uwB6ea4ZwbDsH799mq3AYe3A8LIPEoGRRv83ZV5AJG7xTQvEP7hJi', 5, 3, '{"allow_photo_upload":true,"deposit_mode":"50_percent","enable_delivery_step":false,"custom_fields":[]}', TIMESTAMP '2026-01-01 00:00:00', TIMESTAMP '2026-01-01 00:00:00'),
('ci-tenant-b', 'ci-tenant-b', 'CI Tenant B', '$2b$10$uwB6ea4ZwbDsH799mq3AYe3A8LIPEoGRRv83ZV5AJG7xTQvEP7hJi', 2, 1, '{"allow_photo_upload":true,"deposit_mode":"100_percent","enable_delivery_step":false,"custom_fields":[]}', TIMESTAMP '2026-01-01 00:00:00', TIMESTAMP '2026-01-01 00:00:00');

INSERT INTO "CakeSize" ("id", "tenantId", "name", "servings", "weightKg", "basePrice", "maxFillings", "sortOrder", "active") VALUES
('ci-size-a', 'ci-tenant-a', 'CI Size A', '10 pessoas', 1.5, 100.00, 2, 0, true),
('ci-size-a-inactive', 'ci-tenant-a', 'CI Inactive Size A', '6 pessoas', 0.8, 60.00, 1, 9, false),
('ci-size-b', 'ci-tenant-b', 'CI Size B', '8 pessoas', 1.0, 80.00, 1, 0, true);

INSERT INTO "CakeFlavor" ("id", "tenantId", "name", "type", "additionalPrice", "isSpecial", "imageUrl", "active", "sortOrder") VALUES
('ci-flavor-a', 'ci-tenant-a', 'CI Flavor A', 'MASSA', 0.00, false, '', true, 0),
('ci-filling-a', 'ci-tenant-a', 'CI Filling A', 'RECHEIO', 10.00, false, '', true, 0),
('ci-filling-a-2', 'ci-tenant-a', 'CI Filling A 2', 'RECHEIO', 20.00, false, '', true, 1),
('ci-filling-a-3', 'ci-tenant-a', 'CI Filling A 3', 'RECHEIO', 30.00, false, '', true, 2),
('ci-flavor-b', 'ci-tenant-b', 'CI Flavor B', 'MASSA', 5.00, false, '', true, 0),
('ci-filling-b', 'ci-tenant-b', 'CI Filling B', 'RECHEIO', 0.00, false, '', true, 0);

INSERT INTO "Addon" ("id", "tenantId", "name", "description", "price", "imageUrl", "active", "sortOrder") VALUES
('ci-addon-a', 'ci-tenant-a', 'CI Addon A', 'Order authority fixture', 15.00, '', true, 0),
('ci-addon-b', 'ci-tenant-b', 'CI Addon B', 'Tenant isolation fixture', 5.00, '', true, 0);

INSERT INTO "BlockedDate" ("id", "tenantId", "date", "reason") VALUES
('ci-blocked-a', 'ci-tenant-a', '2030-01-09', 'CI blocked date');

INSERT INTO "WorkSchedule" ("id", "tenantId", "dayOfWeek", "isOpen") VALUES
('ci-schedule-a', 'ci-tenant-a', 1, true),
('ci-schedule-a-closed', 'ci-tenant-a', 2, false),
('ci-schedule-b', 'ci-tenant-b', 1, true);

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Tenant" WHERE "id" IN ('ci-tenant-a', 'ci-tenant-b')) <> 2 THEN
    RAISE EXCEPTION 'CI seed verification failed: expected two tenants';
  END IF;
END
$$;
