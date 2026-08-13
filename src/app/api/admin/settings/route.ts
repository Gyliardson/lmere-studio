import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });

function serializeSettings(tenant: {
  adminPasswordHash: string;
  shadowColor: string;
  primaryColor: string;
  featuresConfig: string;
  [key: string]: unknown;
}) {
  const { adminPasswordHash: _adminPasswordHash, ...settings } = tenant;
  return {
    ...settings,
    shadowColor: tenant.shadowColor || tenant.primaryColor || "#8B5CF6",
    featuresConfig: JSON.parse(tenant.featuresConfig),
  };
}

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
    if (!tenant) return unauthorized();

    return NextResponse.json({ settings: serializeSettings(tenant) });
  } catch (error) {
    console.error("[ERROR] Failed to fetch admin settings", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const rawUpdates = await request.json();
    const allowedFields = [
      "name", "logoUrl", "bannerUrl", "whatsapp", "pixKey",
      "primaryColor", "secondaryColor", "backgroundColor",
      "buttonColor", "shadowColor", "textColor",
      "maxOrdersPerDay", "minLeadDays", "featuresConfig",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (rawUpdates[key] !== undefined) {
        if (key === "featuresConfig" && typeof rawUpdates[key] === "object" && rawUpdates[key] !== null) {
          sanitized[key] = JSON.stringify(rawUpdates[key]);
        } else {
          sanitized[key] = rawUpdates[key];
        }
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: sanitized,
    });

    return NextResponse.json({ settings: serializeSettings(tenant) });
  } catch (error) {
    console.error("[ERROR] Failed to update admin settings", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
