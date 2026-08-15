-- Custom-field labels are part of the tenant-owned configuration identity.
-- The admin boundary also performs a case-insensitive friendly validation, while
-- this database constraint prevents exact-label duplicates under concurrent writes.
CREATE UNIQUE INDEX "CustomField_tenantId_label_key" ON "CustomField"("tenantId", "label");
