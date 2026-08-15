-- Friendly custom-field label validation is case-insensitive. Enforce the same
-- invariant at PostgreSQL level so concurrent creates cannot bypass the API check.
CREATE UNIQUE INDEX "CustomField_tenantId_label_ci_key"
ON "CustomField" ("tenantId", LOWER("label"));
