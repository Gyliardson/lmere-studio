import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export interface RateLimitPolicy {
  scope: string;
  subject?: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: Date;
}

function rateLimitSecret() {
  const secret = process.env.RATE_LIMIT_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("RATE_LIMIT_SECRET or ADMIN_SESSION_SECRET must be configured with at least 32 bytes");
  }
  return secret;
}

function firstForwardedAddress(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

export function requestRateLimitSource(request: Request) {
  // x-vercel-forwarded-for is trustworthy only when the application is actually
  // running on Vercel. Outside Vercel a direct client could otherwise spoof that
  // header and rotate rate-limit identities.
  if (process.env.VERCEL === "1") {
    const vercelAddress = firstForwardedAddress(request.headers.get("x-vercel-forwarded-for"));
    if (vercelAddress) return vercelAddress;
  }

  // Generic X-Forwarded-For is convenient in local/tests, but production
  // deployments outside Vercel must explicitly opt in only when their trusted
  // reverse proxy overwrites the header.
  const trustForwarded = process.env.NODE_ENV !== "production"
    || process.env.RATE_LIMIT_TRUST_X_FORWARDED_FOR === "true";
  if (trustForwarded) {
    const forwardedAddress = firstForwardedAddress(request.headers.get("x-forwarded-for"));
    if (forwardedAddress) return forwardedAddress;
  }

  return "unidentified-source";
}

function bucketKey(policy: RateLimitPolicy, source: string, windowStartMs: number) {
  return createHmac("sha256", rateLimitSecret())
    .update(`lmere-rate-limit-v1\0${policy.scope}\0${policy.subject ?? ""}\0${source}\0${windowStartMs}`)
    .digest("hex");
}

async function cleanupExpiredBuckets(now: Date) {
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  } catch (error) {
    console.error("[WARN] Rate-limit cleanup failed", error instanceof Error ? error.message : "unknown error");
  }
}

export async function consumeRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  nowMs = Date.now(),
): Promise<RateLimitResult> {
  if (!policy.scope || !Number.isSafeInteger(policy.limit) || policy.limit < 1 || !Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1000) {
    throw new Error("Invalid rate-limit policy");
  }

  const source = requestRateLimitSource(request);
  const windowStartMs = Math.floor(nowMs / policy.windowMs) * policy.windowMs;
  const resetAt = new Date(windowStartMs + policy.windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - nowMs) / 1000));

  // Local/dev requests often have no trustworthy proxy-derived client address.
  // Do not make unrelated developer/test traffic share one artificial bucket;
  // focused tests can still exercise the limiter by supplying an explicit
  // forwarded source. Production remains fail-constrained if its proxy contract
  // is misconfigured and no source can be identified.
  if (source === "unidentified-source" && process.env.NODE_ENV !== "production") {
    return { allowed: true, limit: policy.limit, remaining: policy.limit, retryAfterSeconds, resetAt };
  }

  const key = bucketKey(policy, source, windowStartMs);
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key },
    create: { key, scope: policy.scope, count: 1, expiresAt: resetAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (bucket.count === 1) await cleanupExpiredBuckets(new Date(nowMs));

  return {
    allowed: bucket.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds,
    resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}
