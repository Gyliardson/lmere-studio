export const DEMO_SEED_OPT_IN = "LMERE_ALLOW_DEMO_SEED";

export interface DemoSeedPreflight {
  targetDatabase: string;
}

export function safeDatabaseIdentity(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("POSTGRES_PRISMA_URL must be a valid PostgreSQL URL before demo seeding");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("POSTGRES_PRISMA_URL must use the postgresql:// or postgres:// scheme");
  }

  if (!parsed.hostname) {
    throw new Error("POSTGRES_PRISMA_URL must identify a database host");
  }

  // Keep the URL parser's percent-encoded pathname so control characters cannot
  // become terminal/log injection when the safe target identity is printed.
  const database = parsed.pathname.replace(/^\/+/, "");
  if (!database) {
    throw new Error("POSTGRES_PRISMA_URL must identify a database name");
  }

  const host = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  return `${host}/${database}`;
}

export function assertDemoSeedAllowed(env: NodeJS.ProcessEnv = process.env): DemoSeedPreflight {
  if (env.NODE_ENV === "production") {
    throw new Error("Demo seed is disabled when NODE_ENV=production");
  }

  if (env[DEMO_SEED_OPT_IN] !== "true") {
    throw new Error(`Demo seed requires explicit opt-in: ${DEMO_SEED_OPT_IN}=true`);
  }

  const databaseUrl = env.POSTGRES_PRISMA_URL;
  if (!databaseUrl) {
    throw new Error("POSTGRES_PRISMA_URL is required for demo seeding");
  }

  return { targetDatabase: safeDatabaseIdentity(databaseUrl) };
}
