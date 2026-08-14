import { compareSync } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminSession,
} from "@/lib/admin-session";

const UNAUTHORIZED = { error: "Credenciais inválidas" };
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const LOGIN_SOURCE_RATE_LIMIT = { scope: "admin-login-source", limit: 24, windowMs: 15 * 60 * 1000 } as const;
const LOGIN_TENANT_RATE_LIMIT = { scope: "admin-login-tenant", limit: 8, windowMs: 15 * 60 * 1000 } as const;
// Fixed non-production credential hash used only to keep unknown-tenant login
// attempts on the same bcrypt verification path as known tenants.
const DUMMY_PASSWORD_HASH = "$2b$10$vGcCuvAGtutf9QbLKDl2VOTxm/yNRchJO5qpcyDgqP5a5kZWo8dDa";

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...init?.headers,
    },
  });
}

function rateLimitedResponse(rateLimit: Awaited<ReturnType<typeof consumeRateLimit>>) {
  return jsonNoStore(
    { code: "RATE_LIMITED", error: "Muitas tentativas. Tente novamente em instantes." },
    { status: 429, headers: rateLimitHeaders(rateLimit) },
  );
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export async function POST(request: Request) {
  try {
    const sourceLimit = await consumeRateLimit(request, LOGIN_SOURCE_RATE_LIMIT);
    if (!sourceLimit.allowed) return rateLimitedResponse(sourceLimit);

    const { slug, password } = await request.json();

    if (typeof slug !== "string" || typeof password !== "string" || !slug.trim() || !password) {
      return jsonNoStore({ error: "Credenciais ausentes" }, { status: 400 });
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const tenantLimit = await consumeRateLimit(request, {
      ...LOGIN_TENANT_RATE_LIMIT,
      subject: normalizedSlug,
    });
    if (!tenantLimit.allowed) return rateLimitedResponse(tenantLimit);

    const tenant = await prisma.tenant.findUnique({ where: { slug: slug.trim() } });
    const passwordValid = compareSync(password, tenant?.adminPasswordHash ?? DUMMY_PASSWORD_HASH);
    if (!tenant || !passwordValid) {
      return jsonNoStore(UNAUTHORIZED, { status: 401 });
    }

    const token = createAdminSessionToken(tenant.id);
    const response = jsonNoStore({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[ERROR] Admin authentication failed", error instanceof Error ? error.message : "unknown error");
    return jsonNoStore({ error: "Erro na autenticação" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return clearSessionCookie(jsonNoStore({ error: "Sessão inválida ou expirada" }, { status: 401 }));
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) {
      return clearSessionCookie(jsonNoStore({ error: "Sessão inválida ou expirada" }, { status: 401 }));
    }

    return jsonNoStore({ tenant, expiresAt: session.expiresAt });
  } catch (error) {
    console.error("[ERROR] Admin session validation failed", error instanceof Error ? error.message : "unknown error");
    return jsonNoStore({ error: "Erro na autenticação" }, { status: 500 });
  }
}

export async function DELETE() {
  return clearSessionCookie(jsonNoStore({ success: true }));
}
