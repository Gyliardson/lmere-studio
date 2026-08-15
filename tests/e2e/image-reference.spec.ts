import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

const validOrder = {
  tenantId: "ci-tenant-a",
  customerName: "Image Contract CI",
  customerPhone: "11999999999",
  eventDate: "2030-01-07",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

function sourceFor(projectName: string) {
  return `198.51.100.${projectName.startsWith("mobile") ? 42 : 41}`;
}

function adminHeaders() {
  return { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken("ci-tenant-a")}` };
}

async function expectOrderAbsent(request: Parameters<Parameters<typeof test>[1]>[0]["request"], customerName: string) {
  const response = await request.get("/api/admin/orders", { headers: adminHeaders() });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.orders.some((order: { customerName: string }) => order.customerName === customerName)).toBe(false);
}

test("public order rejects unsupported embedded image data before persistence", async ({ request }, testInfo) => {
  const customerName = `Rejected GIF ${testInfo.project.name}`;
  const response = await request.post("/api/orders", {
    headers: {
      "x-forwarded-for": sourceFor(testInfo.project.name),
      "idempotency-key": `image-gif-${testInfo.project.name}`,
    },
    data: {
      ...validOrder,
      customerName,
      referenceImageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REFERENCE_IMAGE" });
  await expectOrderAbsent(request, customerName);
});

test("public order rejects insecure or credential-bearing image URLs", async ({ request }, testInfo) => {
  for (const [index, referenceImageUrl] of [
    "http://example.com/reference.png",
    "https://user:secret@example.com/reference.png",
    "javascript:alert(1)",
  ].entries()) {
    const customerName = `Rejected URL ${testInfo.project.name} ${index}`;
    const response = await request.post("/api/orders", {
      headers: {
        "x-forwarded-for": sourceFor(testInfo.project.name),
        "idempotency-key": `image-url-${testInfo.project.name}-${index}`,
      },
      data: { ...validOrder, customerName, referenceImageUrl },
    });

    expect(response.status(), referenceImageUrl).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REFERENCE_IMAGE" });
    await expectOrderAbsent(request, customerName);
  }
});

test("public order accepts a bounded HTTPS image URL", async ({ request }, testInfo) => {
  const response = await request.post("/api/orders", {
    headers: {
      "x-forwarded-for": sourceFor(testInfo.project.name),
      "idempotency-key": `image-valid-${testInfo.project.name}`,
    },
    data: {
      ...validOrder,
      customerName: `Accepted image ${testInfo.project.name}`,
      eventDate: "2030-01-14",
      referenceImageUrl: "https://cdn.example.com/reference.webp",
    },
  });

  expect(response.status()).toBe(201);
  const payload = await response.json();
  expect(payload.order.referenceImageUrl).toBe("https://cdn.example.com/reference.webp");
});
