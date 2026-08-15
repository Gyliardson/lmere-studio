import { expect, test } from "@playwright/test";

const base = {
  tenantId: "ci-tenant-a",
  customerPhone: "5511999999999",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

function capacityDate(projectName: string, retry: number) {
  const projectOffset = projectName.includes("mobile") ? 7 : 0;
  const date = new Date(Date.UTC(2036, 0, 7 + projectOffset + retry * 14));
  return date.toISOString().slice(0, 10);
}

test("rejects orders above tenant daily capacity", async ({ request }, testInfo) => {
  const eventDate = capacityDate(testInfo.project.name, testInfo.retry);
  for (let index = 0; index < 5; index += 1) {
    const response = await request.post("/api/orders", {
      data: { ...base, eventDate, customerName: `Capacity ${testInfo.project.name} ${index}` },
    });
    expect(response.status()).toBe(201);
  }

  const overflow = await request.post("/api/orders", {
    data: { ...base, eventDate, customerName: `Capacity overflow ${testInfo.project.name}` },
  });
  expect(overflow.status()).toBe(409);
  expect((await overflow.json()).code).toBe("DAILY_CAPACITY_REACHED");
});
