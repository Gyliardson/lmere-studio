import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatorio" }, { status: 400 });
    }

    const where: Record<string, unknown> = { tenantId };
    if (status && status !== "all") {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { cakeSize: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[ERROR] Failed to fetch orders:", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "id e status obrigatorios" }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[ERROR] Failed to update order:", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 });
  }
}
