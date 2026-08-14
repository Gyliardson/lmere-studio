import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RateLimitPolicy {
  scope: string;
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
  // Vercel documents x-vercel-forwarded-for as the deployment-controlled client
  // address. Generic x-forwarded-for is trusted automatically only on Vercel or
  // outside production; other reverse proxies must opt in explicitly.
  const vercelAddress = firstForwardedAddress(request.headers.get("x-vercel-forwarded-for"));
  if (vercelAddress) return vercelAddress;

  const trustForwarded = process.env.VERCEL === "1"
    || process.env.NODE_ENV !== "production"
    || process.env.RATE_LIMIT_TRUST_X_FORWARDED_FOR === "true";
  if (trustForwarded) {
    const forwardedAddress = firstForwardedAddress(request.headers.get("x-forwarded-for"));
    if (forwardedAddress) return forwardedAddress;
  }

  return "unidentified-source";
}

function bucketKey(policy: RateLimitPolicy, source: string, windowStartMs: number) {
  return createHmac("sha256", rateLimitSecret())
    .update(`lmere-rate-limit-v1\0${policy.scope}\0${source}\0${windowStartMs}`)
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
  const key = bucketKey(policy, source, windowStartMs);

  let count: number;
  try {
    const created = await prisma.rateLimitBucket.create({
      data: { key, scope: policy.scope, count: 1, expiresAt: resetAt },
      select: { count: true },
    });
    count = created.count;
    await cleanupExpiredBuckets(new Date(nowMs));
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;

    const incremented = await prisma.rateLimitBucket.updateMany({
      where: { key, count: { lt: policy.limit } },
      data: { count: { increment: 1 } },
    });

    if (incremented.count === 0) {
      return { allowed: false, limit: policy.limit, remaining: 0, retryAfterSeconds, resetAt };
    }

    const bucket = await prisma.rateLimitBucket.findUnique({ where: { key }, select: { count: true } });
    count = bucket?.count ?? policy.limit;
  }

  return {
    allowed: count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
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
