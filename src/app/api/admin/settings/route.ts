import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatorio" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, slug: true, name: true, logoUrl: true, bannerUrl: true,
        whatsapp: true, pixKey: true, primaryColor: true, secondaryColor: true,
        maxOrdersPerDay: true, minLeadDays: true, featuresConfig: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Atelie nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        ...tenant,
        featuresConfig: JSON.parse(tenant.featuresConfig),
      },
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch settings:", error);
    return NextResponse.json({ error: "Erro ao buscar configuracoes" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, ...updates } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatorio" }, { status: 400 });
    }

    if (updates.featuresConfig && typeof updates.featuresConfig === "object") {
      updates.featuresConfig = JSON.stringify(updates.featuresConfig);
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updates,
    });

    return NextResponse.json({
      settings: {
        ...tenant,
        featuresConfig: JSON.parse(tenant.featuresConfig),
      },
    });
  } catch (error) {
    console.error("[ERROR] Failed to update settings:", error);
    return NextResponse.json({ error: "Erro ao atualizar configuracoes" }, { status: 500 });
  }
}
