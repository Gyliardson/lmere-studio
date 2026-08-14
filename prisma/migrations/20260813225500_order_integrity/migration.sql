ALTER TABLE "Order"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "selectionSnapshot" TEXT NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "Order_tenantId_idempotencyKey_key"
ON "Order"("tenantId", "idempotencyKey");
