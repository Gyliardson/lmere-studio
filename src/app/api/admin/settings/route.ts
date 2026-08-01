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
      select: {
        id: true, slug: true, name: true, logoUrl: true, bannerUrl: true,
        whatsapp: true, pixKey: true,
        primaryColor: true, secondaryColor: true, backgroundColor: true,
        buttonColor: true, textColor: true,
        maxOrdersPerDay: true, minLeadDays: true, featuresConfig: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Ateliê não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        ...tenant,
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
      "buttonColor", "textColor",
      "maxOrdersPerDay", "minLeadDays", "featuresConfig",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (rawUpdates[key] !== undefined) {
        if (key === "featuresConfig" && typeof rawUpdates[key] === "object") {
          sanitized[key] = JSON.stringify(rawUpdates[key]);
        } else {
          sanitized[key] = rawUpdates[key];
        }
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: sanitized,
    });

    return NextResponse.json({
      settings: {
        ...tenant,
        featuresConfig: JSON.parse(tenant.featuresConfig),
      },
    });
  } catch (error) {
    console.error("[ERROR] Failed to update settings:", error);
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
