import { expect, test, type TestInfo } from "@playwright/test";

const CI_PASSWORD = "ci-admin-password";

function source(testInfo: TestInfo, suffix: number) {
  const projectOffset = testInfo.project.name.includes("mobile") ? 100 : 0;
  return `198.51.${100 + suffix}.${10 + projectOffset}`;
}

test.describe("sensitive endpoint throttling", () => {
  test("admin login is bounded per source+tenant without blocking another tenant", async ({ request }, testInfo) => {
    const blockedSource = source(testInfo, 1);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request.post("/api/admin/auth", {
        headers: { "x-vercel-forwarded-for": blockedSource },
        data: { slug: "ci-tenant-a", password: `wrong-password-${attempt}` },
      });
      expect(response.status()).toBe(401);
    }

    const limited = await request.post("/api/admin/auth", {
      headers: { "x-vercel-forwarded-for": blockedSource },
      data: { slug: "ci-tenant-a", password: CI_PASSWORD },
    });

    expect(limited.status()).toBe(429);
    expect(await limited.json()).toEqual({
      code: "RATE_LIMITED",
      error: "Muitas tentativas. Tente novamente em instantes.",
    });
    expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
    expect(limited.headers()["x-ratelimit-limit"]).toBe("8");
    expect(limited.headers()["x-ratelimit-remaining"]).toBe("0");

    const otherTenant = await request.post("/api/admin/auth", {
      headers: { "x-vercel-forwarded-for": blockedSource },
      data: { slug: "ci-tenant-b", password: CI_PASSWORD },
    });
    expect(otherTenant.status()).toBe(200);

    const independentSource = await request.post("/api/admin/auth", {
      headers: { "x-vercel-forwarded-for": source(testInfo, 2) },
      data: { slug: "ci-tenant-a", password: CI_PASSWORD },
    });
    expect(independentSource.status()).toBe(200);
  });

  test("public order tenant limiter remains atomic under an abusive concurrent burst", async ({ request }, testInfo) => {
    const abusiveSource = source(testInfo, 3);
    const responses = await Promise.all(
      Array.from({ length: 40 }, () => request.post("/api/orders", {
        headers: { "x-vercel-forwarded-for": abusiveSource },
        data: { tenantId: "ci-tenant-a" },
      })),
    );

    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 400)).toHaveLength(30);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
    expect(statuses.every((status) => status === 400 || status === 429)).toBe(true);

    const limited = responses.find((response) => response.status() === 429);
    expect(limited).toBeDefined();
    expect(await limited!.json()).toEqual({
      code: "RATE_LIMITED",
      error: "Muitas tentativas de pedido. Tente novamente em instantes.",
    });
    expect(Number(limited!.headers()["retry-after"])).toBeGreaterThan(0);
    expect(limited!.headers()["x-ratelimit-limit"]).toBe("30");
    expect(limited!.headers()["x-ratelimit-remaining"]).toBe("0");

    const otherTenant = await request.post("/api/orders", {
      headers: { "x-vercel-forwarded-for": abusiveSource },
      data: { tenantId: "ci-tenant-b" },
    });
    expect(otherTenant.status()).toBe(400);

    const independentSource = await request.post("/api/orders", {
      headers: { "x-vercel-forwarded-for": source(testInfo, 4) },
      data: { tenantId: "ci-tenant-a" },
    });
    expect(independentSource.status()).toBe(400);
  });
});
