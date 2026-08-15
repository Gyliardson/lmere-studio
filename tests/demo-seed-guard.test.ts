import assert from "node:assert/strict";
import test from "node:test";

import { assertDemoSeedAllowed, safeDatabaseIdentity } from "../src/lib/demo-seed-guard";

test("demo seed refuses production even with explicit opt-in", () => {
  assert.throws(
    () => assertDemoSeedAllowed({
      NODE_ENV: "production",
      LMERE_ALLOW_DEMO_SEED: "true",
      POSTGRES_PRISMA_URL: "postgresql://demo:secret@db.example.com/lmere",
    }),
    /disabled when NODE_ENV=production/,
  );
});

test("demo seed refuses destructive work without exact explicit opt-in", () => {
  assert.throws(
    () => assertDemoSeedAllowed({
      NODE_ENV: "development",
      LMERE_ALLOW_DEMO_SEED: "1",
      POSTGRES_PRISMA_URL: "postgresql://demo:secret@db.example.com/lmere",
    }),
    /requires explicit opt-in/,
  );
});

test("safe database identity excludes credentials and query parameters", () => {
  const identity = safeDatabaseIdentity(
    "postgresql://alice:s3cr%40t@db.example.com:6543/lmere_demo?sslmode=require&application_name=seed",
  );

  assert.equal(identity, "db.example.com:6543/lmere_demo");
  assert.equal(identity.includes("alice"), false);
  assert.equal(identity.includes("s3cr"), false);
  assert.equal(identity.includes("sslmode"), false);
});

test("demo seed preflight permits an opted-in non-production database", () => {
  const preflight = assertDemoSeedAllowed({
    NODE_ENV: "development",
    LMERE_ALLOW_DEMO_SEED: "true",
    POSTGRES_PRISMA_URL: "postgres://postgres:postgres@127.0.0.1:5432/lmere_demo?sslmode=disable",
    LMERE_DEMO_ADMIN_PASSWORD: "local-only-password",
  });

  assert.deepEqual(preflight, {
    targetDatabase: "127.0.0.1:5432/lmere_demo",
    adminPassword: "local-only-password",
  });
});

test("demo seed rejects non-PostgreSQL targets and missing database names", () => {
  assert.throws(() => safeDatabaseIdentity("https://db.example.com/lmere"), /must use the postgresql:\/\//);
  assert.throws(() => safeDatabaseIdentity("postgresql://db.example.com"), /database name/);
});
