import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  validateBlockedDate,
  validateWorkSchedule,
  type ValidationIssue,
} from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
const invalidJson = () => NextResponse.json({ code: "INVALID_JSON", error: "Corpo JSON inválido" }, { status: 400 });
const validationError = (issues: ValidationIssue[]) => NextResponse.json({
  code: "VALIDATION_ERROR",
  error: "Dados inválidos",
  issues,
}, { status: 422 });

async function jsonBody(request: Request) {
  try {
    return { ok: true as const, value: await request.json() as unknown };
  } catch {
    return { ok: false as const };
  }
}

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const [blockedDates, workSchedule] = await Promise.all([
      prisma.blockedDate.findMany({ where: { tenantId: session.tenantId }, orderBy: { date: "asc" } }),
      prisma.workSchedule.findMany({ where: { tenantId: session.tenantId }, orderBy: { dayOfWeek: "asc" } }),
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

    const body = await jsonBody(request);
    if (!body.ok) return invalidJson();
    const parsed = validateBlockedDate(body.value);
    if (!parsed.ok) return validationError(parsed.issues);

    const existing = await prisma.blockedDate.findFirst({
      where: { tenantId: session.tenantId, date: parsed.value.date },
    });
    if (existing) return NextResponse.json({ error: "Data já bloqueada" }, { status: 409 });

    const blocked = await prisma.blockedDate.create({
      data: { tenantId: session.tenantId, ...parsed.value },
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

    const body = await jsonBody(request);
    if (!body.ok) return invalidJson();
    const parsed = validateWorkSchedule(body.value);
    if (!parsed.ok) return validationError(parsed.issues);

    const schedule = await prisma.workSchedule.upsert({
      where: { tenantId_dayOfWeek: { tenantId: session.tenantId, dayOfWeek: parsed.value.dayOfWeek } },
      update: { isOpen: parsed.value.isOpen },
      create: { tenantId: session.tenantId, ...parsed.value },
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
