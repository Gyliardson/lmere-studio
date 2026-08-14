-- New tenants must begin with a complete feature contract rather than `{}`.
-- Existing rows are intentionally not rewritten by this migration.
ALTER TABLE "Tenant"
  ALTER COLUMN "featuresConfig"
  SET DEFAULT '{"allow_photo_upload":true,"deposit_mode":"50_percent","enable_delivery_step":false,"custom_fields":[]}';
