import { expect, test } from "@playwright/test";
import { prisma } from "../../src/lib/prisma";

const validOrder = {
  tenantId: "ci-tenant-a",
  customerName: "Invalid Config Guard",
  customerPhone: "5511999999999",
  eventDate: "2029-08-30",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("new orders fail constrained instead of inventing a payment rule from corrupt persisted config", async ({ request }) => {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: "ci-tenant-a" },
    select: { featuresConfig: true },
  });

  await prisma.tenant.update({
    where: { id: "ci-tenant-a" },
    data: {
      featuresConfig: JSON.stringify({
        allow_photo_upload: true,
        deposit_mode: "fixed",
        enable_delivery_step: false,
        custom_fields: [],
      }),
    },
  });

  try {
    const response = await request.post("/api/orders", { data: validOrder });
    expect(response.status()).toBe(500);
    expect(await response.json()).toEqual({
      code: "INVALID_TENANT_CONFIG",
      error: "Configuração financeira do ateliê inválida",
    });

    expect(await prisma.order.count({
      where: { tenantId: "ci-tenant-a", customerName: validOrder.customerName },
    })).toBe(0);
  } finally {
    await prisma.tenant.update({
      where: { id: "ci-tenant-a" },
      data: { featuresConfig: tenant.featuresConfig },
    });
  }
});
