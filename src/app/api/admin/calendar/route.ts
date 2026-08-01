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

    const workSchedule = await prisma.workSchedule.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ blockedDates, workSchedule });
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

export async function PUT(request: Request) {
  try {
    const { tenantId, dayOfWeek, isOpen } = await request.json();
    if (!tenantId || dayOfWeek === undefined) {
      return NextResponse.json({ error: "tenantId e dayOfWeek obrigatorios" }, { status: 400 });
    }

    const schedule = await prisma.workSchedule.upsert({
      where: { tenantId_dayOfWeek: { tenantId, dayOfWeek } },
      update: { isOpen },
      create: { tenantId, dayOfWeek, isOpen },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("[ERROR] Failed to update work schedule:", error);
    return NextResponse.json({ error: "Erro ao atualizar horario" }, { status: 500 });
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
