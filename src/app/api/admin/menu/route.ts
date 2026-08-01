import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });
    }

    const sizes = await prisma.cakeSize.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });

    const flavors = await prisma.cakeFlavor.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });

    const addons = await prisma.addon.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ sizes, flavors, addons });
  } catch (error) {
    console.error("[ERROR] Failed to fetch menu:", error);
    return NextResponse.json({ error: "Erro ao buscar cardápio" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    const tenantId = rawData.tenantId;
    const itemType = rawData.itemType || rawData.type;

    if (!tenantId || !itemType) {
      return NextResponse.json({ error: "tenantId e itemType obrigatórios" }, { status: 400 });
    }

    let item;
    switch (itemType) {
      case "size": {
        item = await prisma.cakeSize.create({
          data: {
            tenantId,
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
      }
      case "flavor": {
        item = await prisma.cakeFlavor.create({
          data: {
            tenantId,
            name: String(rawData.name || ""),
            type: String(rawData.type || "RECHEIO"),
            additionalPrice: Number(rawData.additionalPrice) || 0,
            isSpecial: Boolean(rawData.isSpecial),
            imageUrl: String(rawData.imageUrl || ""),
            sortOrder: Number(rawData.sortOrder) || 0,
            active: rawData.active !== false,
          },
        });
        break;
      }
      case "addon": {
        item = await prisma.addon.create({
          data: {
            tenantId,
            name: String(rawData.name || ""),
            description: String(rawData.description || ""),
            price: Number(rawData.price) || 0,
            imageUrl: String(rawData.imageUrl || ""),
            sortOrder: Number(rawData.sortOrder) || 0,
            active: rawData.active !== false,
          },
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to create menu item:", error);
    return NextResponse.json({ error: "Erro ao criar item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const rawData = await request.json();
    const id = rawData.id;
    const itemType = rawData.itemType || rawData.type;

    if (!id || !itemType) {
      return NextResponse.json({ error: "id e itemType obrigatórios" }, { status: 400 });
    }

    let item;
    switch (itemType) {
      case "size": {
        const updateData: Record<string, unknown> = {};
        if (rawData.name !== undefined) updateData.name = String(rawData.name);
        if (rawData.servings !== undefined) updateData.servings = String(rawData.servings);
        if (rawData.weightKg !== undefined) updateData.weightKg = Number(rawData.weightKg);
        if (rawData.basePrice !== undefined) updateData.basePrice = Number(rawData.basePrice);
        if (rawData.maxFillings !== undefined) updateData.maxFillings = Number(rawData.maxFillings);
        if (rawData.sortOrder !== undefined) updateData.sortOrder = Number(rawData.sortOrder);
        if (rawData.active !== undefined) updateData.active = Boolean(rawData.active);

        item = await prisma.cakeSize.update({
          where: { id: String(id) },
          data: updateData,
        });
        break;
      }
      case "flavor": {
        const updateData: Record<string, unknown> = {};
        if (rawData.name !== undefined) updateData.name = String(rawData.name);
        if (rawData.type !== undefined) updateData.type = String(rawData.type);
        if (rawData.additionalPrice !== undefined) updateData.additionalPrice = Number(rawData.additionalPrice);
        if (rawData.isSpecial !== undefined) updateData.isSpecial = Boolean(rawData.isSpecial);
        if (rawData.imageUrl !== undefined) updateData.imageUrl = String(rawData.imageUrl);
        if (rawData.sortOrder !== undefined) updateData.sortOrder = Number(rawData.sortOrder);
        if (rawData.active !== undefined) updateData.active = Boolean(rawData.active);

        item = await prisma.cakeFlavor.update({
          where: { id: String(id) },
          data: updateData,
        });
        break;
      }
      case "addon": {
        const updateData: Record<string, unknown> = {};
        if (rawData.name !== undefined) updateData.name = String(rawData.name);
        if (rawData.description !== undefined) updateData.description = String(rawData.description);
        if (rawData.price !== undefined) updateData.price = Number(rawData.price);
        if (rawData.imageUrl !== undefined) updateData.imageUrl = String(rawData.imageUrl);
        if (rawData.sortOrder !== undefined) updateData.sortOrder = Number(rawData.sortOrder);
        if (rawData.active !== undefined) updateData.active = Boolean(rawData.active);

        item = await prisma.addon.update({
          where: { id: String(id) },
          data: updateData,
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[ERROR] Failed to update menu item:", error);
    return NextResponse.json({ error: "Erro ao atualizar item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ error: "id e type obrigatórios" }, { status: 400 });
    }

    switch (type) {
      case "size":
        await prisma.cakeSize.delete({ where: { id } });
        break;
      case "flavor":
        await prisma.cakeFlavor.delete({ where: { id } });
        break;
      case "addon":
        await prisma.addon.delete({ where: { id } });
        break;
      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to delete menu item:", error);
    return NextResponse.json({ error: "Erro ao excluir item" }, { status: 500 });
  }
}
