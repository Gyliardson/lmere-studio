import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Ateliê não encontrado" }, { status: 404 });
    }

    const { adminPasswordHash, ...settings } = tenant;

    return NextResponse.json({
      settings: {
        ...settings,
        shadowColor: (tenant as Record<string, unknown>).shadowColor || tenant.primaryColor || "#8B5CF6",
        featuresConfig: JSON.parse(tenant.featuresConfig),
      },
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch settings:", error);
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, ...rawUpdates } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });
    }

    /* Whitelist only valid Tenant fields to prevent Prisma errors */
    const allowedFields = [
      "name", "logoUrl", "bannerUrl", "whatsapp", "pixKey",
      "primaryColor", "secondaryColor", "backgroundColor",
      "buttonColor", "shadowColor", "textColor",
      "maxOrdersPerDay", "minLeadDays", "featuresConfig",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (rawUpdates[key] !== undefined && key !== "shadowColor") {
        if (key === "featuresConfig" && typeof rawUpdates[key] === "object") {
          sanitized[key] = JSON.stringify(rawUpdates[key]);
        } else {
          sanitized[key] = rawUpdates[key];
        }
      }
    }

    if (rawUpdates.shadowColor) {
      await prisma.$executeRawUnsafe(
        `UPDATE Tenant SET shadowColor = ? WHERE id = ?`,
        String(rawUpdates.shadowColor),
        tenantId
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: sanitized,
    });

    const { adminPasswordHash, ...settings } = tenant;

    return NextResponse.json({
      settings: {
        ...settings,
        shadowColor: String(rawUpdates.shadowColor || (tenant as Record<string, unknown>).shadowColor || tenant.primaryColor || "#8B5CF6"),
        featuresConfig: JSON.parse(tenant.featuresConfig),
      },
    });
  } catch (error) {
    console.error("[ERROR] Failed to update settings:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
