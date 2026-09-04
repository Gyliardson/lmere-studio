-- One-time production tenant bootstrap after the explicitly authorized schema reset.
-- The password is stored only as a bcrypt hash; plaintext is never committed.
INSERT INTO "Tenant" (
  "id",
  "slug",
  "name",
  "adminPasswordHash",
  "createdAt",
  "updatedAt"
)
VALUES (
  '95791968-9660-489a-8707-4b042ac9d05c',
  'doce-arte',
  'Doce Arte Confeitaria',
  '$2b$10$YZABeDzSPyIWlQOr1oiqZ.O9Te0X/qZ6NydobLoLnvWyO9Qd7HvRO',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE
SET "adminPasswordHash" = EXCLUDED."adminPasswordHash",
    "updatedAt" = CURRENT_TIMESTAMP;
