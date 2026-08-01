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
      include: {
        cakeSizes: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        cakeFlavors: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        addons: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        blockedDates: true,
        workSchedule: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Atelie nao encontrado" },
        { status: 404 }
      );
    }

    const { adminPasswordHash, ...publicTenant } = tenant;

    const doughs = tenant.cakeFlavors.filter((f) => f.type === "MASSA");
    const fillings = tenant.cakeFlavors.filter((f) => f.type === "RECHEIO");

    return NextResponse.json({
      tenant: {
        ...publicTenant,
        featuresConfig: JSON.parse(publicTenant.featuresConfig),
      },
      sizes: tenant.cakeSizes,
      doughs,
      fillings,
      addons: tenant.addons,
      blockedDates: tenant.blockedDates,
      workSchedule: tenant.workSchedule,
    });
  } catch (error) {
    console.error("[ERROR] Failed to fetch tenant:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
