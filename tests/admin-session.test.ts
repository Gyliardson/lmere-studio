import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  getAdminSession,
  verifyAdminSessionToken,
} from "../src/lib/admin-session";

process.env.ADMIN_SESSION_SECRET = "x".repeat(40);
const NOW = Date.UTC(2026, 7, 13, 12, 0, 0);

test("valid signed session preserves tenant, expiration and revocation generation", () => {
  const token = createAdminSessionToken("tenant-a", NOW, 7);
  assert.deepEqual(verifyAdminSessionToken(token, NOW + 1_000), {
    tenantId: "tenant-a",
    expiresAt: Math.floor(NOW / 1000) + ADMIN_SESSION_TTL_SECONDS,
    sessionVersion: 7,
  });
});

test("legacy signed session without an explicit generation defaults to zero", () => {
  const expiresAt = Math.floor(NOW / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ version: 1, tenantId: "tenant-a", expiresAt }), "utf8").toString("base64url");
  const signature = createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");
  assert.deepEqual(verifyAdminSessionToken(`${payload}.${signature}`, NOW), {
    tenantId: "tenant-a",
    expiresAt,
    sessionVersion: 0,
  });
});

test("changed session content is rejected", () => {
  const token = createAdminSessionToken("tenant-a", NOW);
  const signature = token.split(".")[1];
  const changed = Buffer.from(JSON.stringify({ version: 1, tenantId: "tenant-b", expiresAt: Math.floor(NOW / 1000) + 3600, sessionVersion: 0 })).toString("base64url");
  assert.equal(verifyAdminSessionToken(`${changed}.${signature}`, NOW), null);
});

test("expired and malformed sessions are rejected", () => {
  const token = createAdminSessionToken("tenant-a", NOW);
  assert.equal(verifyAdminSessionToken(token, NOW + ADMIN_SESSION_TTL_SECONDS * 1000 + 1), null);
  assert.equal(verifyAdminSessionToken(undefined, NOW), null);
  assert.equal(verifyAdminSessionToken("invalid", NOW), null);
});

test("request session is read from the admin cookie", () => {
  const token = createAdminSessionToken("tenant-a", NOW, 2);
  const request = new Request("http://localhost/api/admin/orders", {
    headers: { cookie: `other=value; ${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` },
  });
  assert.deepEqual(getAdminSession(request, NOW), {
    tenantId: "tenant-a",
    expiresAt: Math.floor(NOW / 1000) + ADMIN_SESSION_TTL_SECONDS,
    sessionVersion: 2,
  });
  assert.equal(getAdminSession(new Request("http://localhost/api/admin/orders"), NOW), null);
});

test("malformed percent-encoded session cookie is rejected instead of throwing", () => {
  const request = new Request("http://localhost/api/admin/orders", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=%E0%A4%A` },
  });
  assert.equal(getAdminSession(request, NOW), null);
});
