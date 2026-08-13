import { expect, test } from "@playwright/test";

const SESSION_COOKIE = "lmere_admin_session";

test.describe("admin session cookie contract", () => {
  test("login responses are non-cacheable and scope the session cookie to admin APIs", async ({ request }) => {
    const login = await request.post("/api/admin/auth", {
      data: { slug: "ci-tenant-a", password: "ci-admin-password" },
    });

    expect(login.status()).toBe(200);
    expect(login.headers()["cache-control"]).toContain("no-store");
    const setCookie = login.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Path=\/api\/admin/i);
  });

  test("invalid session lookup clears the stale cookie", async ({ request }) => {
    const response = await request.get("/api/admin/auth", {
      headers: { cookie: `${SESSION_COOKIE}=invalid` },
    });

    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/Path=\/api\/admin/i);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
