import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminSession,
  verifyAdminSessionToken,
} from "../src/lib/admin-session";

process.env.ADMIN_SESSION_SECRET = "x".repeat(40);
const NOW = Date.UTC(2026, 7, 13, 12, 0, 0);

test("valid signed session preserves tenant and expiration", () => {
  const token = createAdminSessionToken("tenant-a", NOW);
  assert.deepEqual(verifyAdminSessionToken(token, NOW + 1_000), {
    tenantId: "tenant-a",
    expiresAt: Math.floor(NOW / 1000) + ADMIN_SESSION_TTL_SECONDS,
  });
});

test("changed session content is rejected", () => {
  const token = createAdminSessionToken("tenant-a", NOW);
  const signature = token.split(".")[1];
  const changed = Buffer.from(JSON.stringify({ version: 1, tenantId: "tenant-b", expiresAt: Math.floor(NOW / 1000) + 3600 })).toString("base64url");
  assert.equal(verifyAdminSessionToken(`${changed}.${signature}`, NOW), null);
});

test("expired and malformed sessions are rejected", () => {
  const token = createAdminSessionToken("tenant-a", NOW);
  assert.equal(verifyAdminSessionToken(token, NOW + ADMIN_SESSION_TTL_SECONDS * 1000 + 1), null);
  assert.equal(verifyAdminSessionToken(undefined, NOW), null);
  assert.equal(verifyAdminSessionToken("invalid", NOW), null);
});

test("request session is read from the admin cookie", () => {
  const token = createAdminSessionToken("tenant-a", NOW);
  const request = new Request("http://localhost/api/admin/orders", {
    headers: { cookie: `other=value; ${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` },
  });
  assert.equal(getAdminSession(request, NOW)?.tenantId, "tenant-a");
  assert.equal(getAdminSession(new Request("http://localhost/api/admin/orders"), NOW), null);
});

test("malformed percent-encoded session cookie is rejected instead of throwing", () => {
  const request = new Request("http://localhost/api/admin/orders", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=%E0%A4%A` },
  });
  assert.equal(getAdminSession(request, NOW), null);
});

test("admin cookie is constrained to the protected API surface", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert.deepEqual(adminSessionCookieOptions(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api/admin",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  process.env.NODE_ENV = previousNodeEnv;
});
