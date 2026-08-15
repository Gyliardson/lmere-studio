import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "lmere_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

interface AdminSessionPayload {
  version: 1;
  tenantId: string;
  expiresAt: number;
  sessionVersion?: number;
}

export interface AdminSession {
  tenantId: string;
  expiresAt: number;
  sessionVersion: number;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 32 bytes");
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function signaturesMatch(expected: string, provided: string): boolean {
  try {
    const expectedBytes = Buffer.from(expected, "base64url");
    const providedBytes = Buffer.from(provided, "base64url");
    return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
  } catch {
    return false;
  }
}

export function createAdminSessionToken(tenantId: string, nowMs = Date.now(), sessionVersion = 0): string {
  if (!tenantId) throw new Error("tenantId is required for an admin session");
  if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) {
    throw new Error("sessionVersion must be a non-negative safe integer");
  }

  const payload: AdminSessionPayload = {
    version: 1,
    tenantId,
    expiresAt: Math.floor(nowMs / 1000) + ADMIN_SESSION_TTL_SECONDS,
    sessionVersion,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminSessionToken(token: string | undefined, nowMs = Date.now()): AdminSession | null {
  if (!token) return null;

  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra !== undefined) return null;

  const expectedSignature = sign(encodedPayload);
  if (!signaturesMatch(expectedSignature, providedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    if (payload.version !== 1 || typeof payload.tenantId !== "string" || !payload.tenantId) return null;
    if (typeof payload.expiresAt !== "number" || !Number.isSafeInteger(payload.expiresAt)) return null;
    if (payload.expiresAt <= Math.floor(nowMs / 1000)) return null;

    const sessionVersion = payload.sessionVersion ?? 0;
    if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) return null;

    return { tenantId: payload.tenantId, expiresAt: payload.expiresAt, sessionVersion };
  } catch {
    return null;
  }
}

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getAdminSession(request: Request, nowMs = Date.now()): AdminSession | null {
  const token = getCookieValue(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  return verifyAdminSessionToken(token, nowMs);
}

export async function getVerifiedAdminSession(request: Request, nowMs = Date.now()): Promise<AdminSession | null> {
  const session = getAdminSession(request, nowMs);
  if (!session) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { adminSessionVersion: true },
  });
  if (!tenant || tenant.adminSessionVersion !== session.sessionVersion) return null;
  return session;
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/admin",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}
