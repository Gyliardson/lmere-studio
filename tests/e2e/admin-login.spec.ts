import { expect, test } from "@playwright/test";

const CI_PASSWORD = "ci-admin-password";
const SESSION_COOKIE = "lmere_admin_session";

function extractSessionCookie(setCookie: string): string {
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) throw new Error("Expected admin session cookie in login response");
  return `${SESSION_COOKIE}=${match[1]}`;
}

test.describe("admin authentication API", () => {
  test("does not distinguish unknown tenant from wrong password", async ({ request }) => {
    const unknown = await request.post("/api/admin/auth", {
      data: { slug: "tenant-that-does-not-exist", password: CI_PASSWORD },
    });
    const wrongPassword = await request.post("/api/admin/auth", {
      data: { slug: "ci-tenant-a", password: "wrong-ci-password" },
    });

    expect(unknown.status()).toBe(401);
    expect(wrongPassword.status()).toBe(401);
    expect(await unknown.json()).toEqual(await wrongPassword.json());
  });

  test("login establishes a signed server session and logout expires the client cookie", async ({ request }) => {
    const login = await request.post("/api/admin/auth", {
      data: { slug: "ci-tenant-a", password: CI_PASSWORD },
    });

    expect(login.status()).toBe(200);
    expect(await login.json()).toEqual({
      tenant: { id: "ci-tenant-a", slug: "ci-tenant-a", name: "CI Tenant A" },
    });

    const setCookie = login.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    const sessionCookie = extractSessionCookie(setCookie);

    const current = await request.get("/api/admin/auth", {
      headers: { cookie: sessionCookie },
    });
    expect(current.status()).toBe(200);
    expect((await current.json()).tenant.id).toBe("ci-tenant-a");

    const logout = await request.delete("/api/admin/auth", {
      headers: { cookie: sessionCookie },
    });
    expect(logout.status()).toBe(200);
    const logoutCookie = logout.headers()["set-cookie"] ?? "";
    expect(logoutCookie).toContain(`${SESSION_COOKIE}=`);
    expect(logoutCookie).toMatch(/Max-Age=0/i);
  });
});
