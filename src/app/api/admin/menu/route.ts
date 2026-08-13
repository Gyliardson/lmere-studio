import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
const notFound = () => NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const [sizes, flavors, addons] = await Promise.all([
      prisma.cakeSize.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.cakeFlavor.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.addon.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({ sizes, flavors, addons });
  } catch (error) {
    console.error("[ERROR] Failed to fetch admin menu", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar cardápio" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const rawData = await request.json();
    const itemType = rawData.itemType || rawData.type;
    if (!itemType) return NextResponse.json({ error: "itemType obrigatório" }, { status: 400 });

    let item;
    switch (itemType) {
      case "size":
        item = await prisma.cakeSize.create({
          data: {
            tenantId: session.tenantId,
            name: String(rawData.name || ""),
            servings: String(rawData.servings || ""),
            weightKg: Number(rawData.weightKg) || 1.5,
            basePrice: Number(rawData.basePrice) || 0,
            maxFillings: Number(rawData.maxFillings) || 2,
            sortOrder: Number(rawData.sortOrder) || 0,
            active: rawData.active !== false,
          },
        });
        break;
      case "flavor":
        item = await prisma.cakeFlavor.create({
          data: {
            tenantId: session.tenantId,
            name: String(rawData.name || ""),
            type: String(rawData.flavorType || rawData.category || "RECHEIO"),
            additionalPrice: Number(rawData.additionalPrice) || 0,
            isSpecial: Boolean(rawData.isSpecial),
            imageUrl: String(rawData.imageUrl || ""),
            sortOrder: Number(rawData.sortOrder) || 0,
            active: rawData.active !== false,
          },
        });
        break;
      case "addon":
        item = await prisma.addon.create({
          data: {
            tenantId: session.tenantId,
            name: String(rawData.name || ""),
            description: String(rawData.description || ""),
            price: Number(rawData.price) || 0,
            imageUrl: String(rawData.imageUrl || ""),
            sortOrder: Number(rawData.sortOrder) || 0,
            active: rawData.active !== false,
          },
        });
        break;
      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to create admin menu item", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao criar item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const rawData = await request.json();
    const id = typeof rawData.id === "string" ? rawData.id : "";
    const itemType = rawData.itemType || rawData.type;
    if (!id || !itemType) return NextResponse.json({ error: "id e itemType obrigatórios" }, { status: 400 });

    let item;
    switch (itemType) {
      case "size": {
        const owned = await prisma.cakeSize.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        const updateData: Record<string, unknown> = {};
        if (rawData.name !== undefined) updateData.name = String(rawData.name);
        if (rawData.servings !== undefined) updateData.servings = String(rawData.servings);
        if (rawData.weightKg !== undefined) updateData.weightKg = Number(rawData.weightKg);
        if (rawData.basePrice !== undefined) updateData.basePrice = Number(rawData.basePrice);
        if (rawData.maxFillings !== undefined) updateData.maxFillings = Number(rawData.maxFillings);
        if (rawData.sortOrder !== undefined) updateData.sortOrder = Number(rawData.sortOrder);
        if (rawData.active !== undefined) updateData.active = Boolean(rawData.active);
        item = await prisma.cakeSize.update({ where: { id: owned.id }, data: updateData });
        break;
      }
      case "flavor": {
        const owned = await prisma.cakeFlavor.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        const updateData: Record<string, unknown> = {};
        if (rawData.name !== undefined) updateData.name = String(rawData.name);
        if (rawData.flavorType !== undefined) updateData.type = String(rawData.flavorType);
        if (rawData.category !== undefined) updateData.type = String(rawData.category);
        if (rawData.additionalPrice !== undefined) updateData.additionalPrice = Number(rawData.additionalPrice);
        if (rawData.isSpecial !== undefined) updateData.isSpecial = Boolean(rawData.isSpecial);
        if (rawData.imageUrl !== undefined) updateData.imageUrl = String(rawData.imageUrl);
        if (rawData.sortOrder !== undefined) updateData.sortOrder = Number(rawData.sortOrder);
        if (rawData.active !== undefined) updateData.active = Boolean(rawData.active);
        item = await prisma.cakeFlavor.update({ where: { id: owned.id }, data: updateData });
        break;
      }
      case "addon": {
        const owned = await prisma.addon.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        const updateData: Record<string, unknown> = {};
        if (rawData.name !== undefined) updateData.name = String(rawData.name);
        if (rawData.description !== undefined) updateData.description = String(rawData.description);
        if (rawData.price !== undefined) updateData.price = Number(rawData.price);
        if (rawData.imageUrl !== undefined) updateData.imageUrl = String(rawData.imageUrl);
        if (rawData.sortOrder !== undefined) updateData.sortOrder = Number(rawData.sortOrder);
        if (rawData.active !== undefined) updateData.active = Boolean(rawData.active);
        item = await prisma.addon.update({ where: { id: owned.id }, data: updateData });
        break;
      }
      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[ERROR] Failed to update admin menu item", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    if (!id || !type) return NextResponse.json({ error: "id e type obrigatórios" }, { status: 400 });

    switch (type) {
      case "size": {
        const owned = await prisma.cakeSize.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        await prisma.cakeSize.delete({ where: { id: owned.id } });
        break;
      }
      case "flavor": {
        const owned = await prisma.cakeFlavor.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        await prisma.cakeFlavor.delete({ where: { id: owned.id } });
        break;
      }
      case "addon": {
        const owned = await prisma.addon.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        await prisma.addon.delete({ where: { id: owned.id } });
        break;
      }
      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to delete admin menu item", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao excluir item" }, { status: 500 });
  }
}
