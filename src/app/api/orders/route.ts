import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenantId,
      customerName,
      customerPhone,
      eventDate,
      cakeSizeId,
      flavorId,
      fillingIds,
      addonIds,
      referenceImageUrl,
      cakeMessage,
      details,
      subtotal,
      depositAmount,
      depositMode,
    } = body;

    if (!tenantId || !customerName || !customerPhone || !eventDate || !cakeSizeId || !flavorId) {
      return NextResponse.json(
        { error: "Campos obrigatorios ausentes" },
        { status: 400 }
      );
    }

    const order = await prisma.order.create({
      data: {
        tenantId,
        customerName,
        customerPhone,
        eventDate,
        cakeSizeId,
        flavorId,
        fillingIds: JSON.stringify(fillingIds || []),
        addonIds: JSON.stringify(addonIds || []),
        referenceImageUrl: referenceImageUrl || "",
        cakeMessage: cakeMessage || "",
        details: details || "",
        subtotal,
        depositAmount,
        depositMode: depositMode || "50_percent",
        status: "pending",
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to create order:", error);
    return NextResponse.json(
      { error: "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}
