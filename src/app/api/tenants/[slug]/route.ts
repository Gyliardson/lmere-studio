import { normalizeCustomFields } from "@/lib/custom-fields";
import { normalizePersistedFeaturesConfig } from "@/lib/features-config";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      omit: { adminPasswordHash: true, adminSessionVersion: true },
      include: {
        cakeSizes: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        cakeFlavors: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        addons: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        customFields: { orderBy: { id: "asc" } },
        blockedDates: true,
        workSchedule: true,
      },
    });

    if (!tenant) return NextResponse.json({ error: "Ateliê não encontrado" }, { status: 404 });

    const featuresConfig = normalizePersistedFeaturesConfig(JSON.parse(tenant.featuresConfig) as unknown);
    if (!featuresConfig.ok) {
      console.error("[ERROR] Persisted tenant featuresConfig violates the server contract", tenant.id);
      return NextResponse.json({ error: "Configuração do ateliê inválida" }, { status: 500 });
    }
    const customFields = normalizeCustomFields(tenant.customFields);
    if (!customFields.ok) {
      console.error("[ERROR] Persisted tenant custom fields violate the server contract", tenant.id);
      return NextResponse.json({ error: "Configuração de campos personalizados inválida" }, { status: 500 });
    }

    const doughs = tenant.cakeFlavors.filter((f) => f.type === "MASSA");
    const fillings = tenant.cakeFlavors.filter((f) => f.type === "RECHEIO");

    return NextResponse.json({
      tenant: {
        ...tenant,
        customFields: undefined,
        shadowColor: tenant.shadowColor || tenant.primaryColor || "#8B5CF6",
        featuresConfig: featuresConfig.value,
      },
      sizes: tenant.cakeSizes,
      doughs,
      fillings,
      addons: tenant.addons,
      customFields: customFields.value,
      blockedDates: tenant.blockedDates,
      workSchedule: tenant.workSchedule,
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch tenant:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
