import { expect, test } from "@playwright/test";

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

function sourceFor(testInfo: Parameters<Parameters<typeof test>[1]>[1]) {
  return `198.51.100.${testInfo.project.name.startsWith("mobile") ? 42 : 41}`;
}

test("public order rejects unsupported embedded image data before persistence", async ({ request }, testInfo) => {
  const response = await request.post("/api/orders", {
    headers: {
      "x-forwarded-for": sourceFor(testInfo),
      "idempotency-key": `image-gif-${testInfo.project.name}`,
    },
    data: {
      ...validOrder,
      referenceImageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REFERENCE_IMAGE" });
});

test("public order rejects insecure or credential-bearing image URLs", async ({ request }, testInfo) => {
  for (const [index, referenceImageUrl] of [
    "http://example.com/reference.png",
    "https://user:secret@example.com/reference.png",
    "javascript:alert(1)",
  ].entries()) {
    const response = await request.post("/api/orders", {
      headers: {
        "x-forwarded-for": sourceFor(testInfo),
        "idempotency-key": `image-url-${testInfo.project.name}-${index}`,
      },
      data: { ...validOrder, referenceImageUrl },
    });

    expect(response.status(), referenceImageUrl).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REFERENCE_IMAGE" });
  }
});

test("public order accepts a bounded HTTPS image URL", async ({ request }, testInfo) => {
  const response = await request.post("/api/orders", {
    headers: {
      "x-forwarded-for": sourceFor(testInfo),
      "idempotency-key": `image-valid-${testInfo.project.name}`,
    },
    data: {
      ...validOrder,
      eventDate: "2030-01-14",
      referenceImageUrl: "https://cdn.example.com/reference.webp",
    },
  });

  expect(response.status()).toBe(201);
  const payload = await response.json();
  expect(payload.order.referenceImageUrl).toBe("https://cdn.example.com/reference.webp");
});
