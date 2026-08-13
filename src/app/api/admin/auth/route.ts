import { compareSync } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminSession,
} from "@/lib/admin-session";

const UNAUTHORIZED = { error: "Credenciais inválidas" };

export async function POST(request: Request) {
  try {
    const { slug, password } = await request.json();

    if (typeof slug !== "string" || typeof password !== "string" || !slug.trim() || !password) {
      return NextResponse.json({ error: "Credenciais ausentes" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: slug.trim() } });
    if (!tenant || !compareSync(password, tenant.adminPasswordHash)) {
      return NextResponse.json(UNAUTHORIZED, { status: 401 });
    }

    const token = createAdminSessionToken(tenant.id);
    const response = NextResponse.json({
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
    return NextResponse.json({ error: "Erro na autenticação" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });

    return NextResponse.json({ tenant, expiresAt: session.expiresAt });
  } catch (error) {
    console.error("[ERROR] Admin session validation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro na autenticação" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
