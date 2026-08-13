import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const status = new URL(request.url).searchParams.get("status");
    const orders = await prisma.order.findMany({
      where: {
        tenantId: session.tenantId,
        ...(status && status !== "all" ? { status } : {}),
      },
      include: { cakeSize: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[ERROR] Failed to fetch admin orders", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}

async function updateOrderStatus(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : body.orderId;
    const status = body.status;
    if (typeof id !== "string" || typeof status !== "string" || !id || !status) {
      return NextResponse.json({ error: "id e status obrigatórios" }, { status: 400 });
    }
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const ownedOrder = await prisma.order.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!ownedOrder) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const order = await prisma.order.update({ where: { id: ownedOrder.id }, data: { status } });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("[ERROR] Failed to update admin order", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 });
  }
}

export const PATCH = updateOrderStatus;
export const PUT = updateOrderStatus;
