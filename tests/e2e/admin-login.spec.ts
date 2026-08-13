import { expect, test } from "@playwright/test";

const CI_PASSWORD = "ci-admin-password";

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

  test("login establishes a server session and logout invalidates the client cookie", async ({ request }) => {
    const login = await request.post("/api/admin/auth", {
      data: { slug: "ci-tenant-a", password: CI_PASSWORD },
    });

    expect(login.status()).toBe(200);
    const loginBody = await login.json();
    expect(loginBody).toEqual({
      tenant: { id: "ci-tenant-a", slug: "ci-tenant-a", name: "CI Tenant A" },
    });
    expect(login.headers()["set-cookie"]).toContain("lmere_admin_session=");
    expect(login.headers()["set-cookie"]).toMatch(/HttpOnly/i);
    expect(login.headers()["set-cookie"]).toMatch(/SameSite=Strict/i);

    const current = await request.get("/api/admin/auth");
    expect(current.status()).toBe(200);
    expect((await current.json()).tenant.id).toBe("ci-tenant-a");

    const logout = await request.delete("/api/admin/auth");
    expect(logout.status()).toBe(200);
    expect(logout.headers()["set-cookie"]).toContain("lmere_admin_session=");
    expect(logout.headers()["set-cookie"]).toMatch(/Max-Age=0/i);

    const afterLogout = await request.get("/api/admin/auth");
    expect(afterLogout.status()).toBe(401);
  });
});
