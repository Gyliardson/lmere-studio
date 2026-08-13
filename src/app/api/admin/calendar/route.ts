import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const [blockedDates, workSchedule] = await Promise.all([
      prisma.blockedDate.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { date: "asc" },
      }),
      prisma.workSchedule.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { dayOfWeek: "asc" },
      }),
    ]);

    return NextResponse.json({ blockedDates, workSchedule });
  } catch (error) {
    console.error("[ERROR] Failed to fetch admin calendar", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar calendário" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const body = await request.json();
    const date = typeof body.date === "string" ? body.date : "";
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Esgotado";
    if (!date) return NextResponse.json({ error: "date obrigatório" }, { status: 400 });

    const existing = await prisma.blockedDate.findFirst({
      where: { tenantId: session.tenantId, date },
    });
    if (existing) return NextResponse.json({ error: "Data já bloqueada" }, { status: 409 });

    const blocked = await prisma.blockedDate.create({
      data: { tenantId: session.tenantId, date, reason },
    });
    return NextResponse.json({ blocked }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to block admin date", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao bloquear data" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const body = await request.json();
    const dayOfWeek = Number(body.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || typeof body.isOpen !== "boolean") {
      return NextResponse.json({ error: "dayOfWeek e isOpen válidos são obrigatórios" }, { status: 400 });
    }

    const schedule = await prisma.workSchedule.upsert({
      where: { tenantId_dayOfWeek: { tenantId: session.tenantId, dayOfWeek } },
      update: { isOpen: body.isOpen },
      create: { tenantId: session.tenantId, dayOfWeek, isOpen: body.isOpen },
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("[ERROR] Failed to update admin work schedule", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar horário" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const owned = await prisma.blockedDate.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!owned) return NextResponse.json({ error: "Data bloqueada não encontrada" }, { status: 404 });

    await prisma.blockedDate.delete({ where: { id: owned.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to unblock admin date", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao desbloquear data" }, { status: 500 });
  }
}
