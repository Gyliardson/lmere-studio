-- Presentation-only overlay for reproducible portfolio captures.
-- Apply after prisma/ci-seed.sql on a disposable database.
-- IDs remain identical to the CI fixtures so the capture flow stays deterministic,
-- while visible copy represents a polished synthetic bakery instead of test labels.

UPDATE "Tenant"
SET
  "name" = 'L''Mere Atelier',
  "whatsapp" = '11999999999',
  "pixKey" = 'demo@lmere.local'
WHERE "id" = 'ci-tenant-a';

UPDATE "CakeSize"
SET "name" = 'Clássico P', "servings" = '10 pessoas'
WHERE "id" = 'ci-size-a';

UPDATE "CakeSize"
SET "name" = 'Mini Degustação', "servings" = '6 pessoas'
WHERE "id" = 'ci-size-a-inactive';

UPDATE "CakeFlavor" SET "name" = 'Baunilha' WHERE "id" = 'ci-flavor-a';
UPDATE "CakeFlavor" SET "name" = 'Brigadeiro Belga' WHERE "id" = 'ci-filling-a';
UPDATE "CakeFlavor" SET "name" = 'Doce de Leite' WHERE "id" = 'ci-filling-a-2';
UPDATE "CakeFlavor" SET "name" = 'Frutas Vermelhas' WHERE "id" = 'ci-filling-a-3';

UPDATE "Addon"
SET "name" = 'Topo Personalizado', "description" = 'Topo em acrílico com nome'
WHERE "id" = 'ci-addon-a';

UPDATE "BlockedDate"
SET "reason" = 'Agenda reservada'
WHERE "id" = 'ci-blocked-a';
