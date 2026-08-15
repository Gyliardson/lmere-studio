import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

function authHeaders() {
  return { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken("ci-tenant-a")}` };
}

test("admin catalog rejects sub-cent money before persistence", async ({ request }, testInfo) => {
  const headers = authHeaders();
  const before = await request.get("/api/admin/menu", { headers });
  expect(before.status()).toBe(200);
  const initial = await before.json();
  const sizeBefore = initial.sizes.find((item: { id: string }) => item.id === "ci-size-a");
  expect(sizeBefore.basePrice).toBe(100);

  const subCentSize = await request.put("/api/admin/menu", {
    headers,
    data: { id: "ci-size-a", itemType: "size", basePrice: 100.001 },
  });
  expect(subCentSize.status()).toBe(422);
  const sizeError = await subCentSize.json();
  expect(sizeError.code).toBe("VALIDATION_ERROR");
  expect(sizeError.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "basePrice" }),
  ]));

  const suffix = testInfo.project.name.includes("mobile") ? "m" : "d";
  const flavorName = `Sub-cent flavor ${suffix}`;
  const subCentFlavor = await request.post("/api/admin/menu", {
    headers,
    data: {
      itemType: "flavor",
      name: flavorName,
      type: "MASSA",
      additionalPrice: 0.001,
      isSpecial: false,
      imageUrl: "",
      sortOrder: 999,
      active: true,
    },
  });
  expect(subCentFlavor.status()).toBe(422);

  const addonName = `Sub-cent addon ${suffix}`;
  const subCentAddon = await request.post("/api/admin/menu", {
    headers,
    data: {
      itemType: "addon",
      name: addonName,
      description: "must not persist",
      price: 9.999,
      imageUrl: "",
      sortOrder: 999,
      active: true,
    },
  });
  expect(subCentAddon.status()).toBe(422);

  const after = await request.get("/api/admin/menu", { headers });
  expect(after.status()).toBe(200);
  const persisted = await after.json();
  expect(persisted.sizes.find((item: { id: string }) => item.id === "ci-size-a").basePrice).toBe(100);
  expect(persisted.flavors.some((item: { name: string }) => item.name === flavorName)).toBe(false);
  expect(persisted.addons.some((item: { name: string }) => item.name === addonName)).toBe(false);
});
