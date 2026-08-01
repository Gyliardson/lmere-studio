import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatorio" }, { status: 400 });
    }

    const blockedDates = await prisma.blockedDate.findMany({
      where: { tenantId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ blockedDates });
  } catch (error) {
    console.error("[ERROR] Failed to fetch calendar:", error);
    return NextResponse.json({ error: "Erro ao buscar calendario" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, date, reason } = await request.json();
    if (!tenantId || !date) {
      return NextResponse.json({ error: "tenantId e date obrigatorios" }, { status: 400 });
    }

    const existing = await prisma.blockedDate.findFirst({
      where: { tenantId, date },
    });

    if (existing) {
      return NextResponse.json({ error: "Data ja bloqueada" }, { status: 409 });
    }

    const blocked = await prisma.blockedDate.create({
      data: { tenantId, date, reason: reason || "Esgotado" },
    });

    return NextResponse.json({ blocked }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to block date:", error);
    return NextResponse.json({ error: "Erro ao bloquear data" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
    }

    await prisma.blockedDate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to unblock date:", error);
    return NextResponse.json({ error: "Erro ao desbloquear data" }, { status: 500 });
  }
}
