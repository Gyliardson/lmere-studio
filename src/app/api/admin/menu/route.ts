import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId obrigatorio" }, { status: 400 });
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
    return NextResponse.json({ error: "Erro ao buscar cardapio" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, type, ...data } = body;

    if (!tenantId || !type) {
      return NextResponse.json({ error: "tenantId e type obrigatorios" }, { status: 400 });
    }

    let item;
    switch (type) {
      case "size":
        item = await prisma.cakeSize.create({ data: { tenantId, ...data } });
        break;
      case "flavor":
        item = await prisma.cakeFlavor.create({ data: { tenantId, ...data } });
        break;
      case "addon":
        item = await prisma.addon.create({ data: { tenantId, ...data } });
        break;
      default:
        return NextResponse.json({ error: "Tipo invalido" }, { status: 400 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to create menu item:", error);
    return NextResponse.json({ error: "Erro ao criar item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, type, ...data } = body;

    if (!id || !type) {
      return NextResponse.json({ error: "id e type obrigatorios" }, { status: 400 });
    }

    let item;
    switch (type) {
      case "size":
        item = await prisma.cakeSize.update({ where: { id }, data });
        break;
      case "flavor":
        item = await prisma.cakeFlavor.update({ where: { id }, data });
        break;
      case "addon":
        item = await prisma.addon.update({ where: { id }, data });
        break;
      default:
        return NextResponse.json({ error: "Tipo invalido" }, { status: 400 });
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
      return NextResponse.json({ error: "id e type obrigatorios" }, { status: 400 });
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
        return NextResponse.json({ error: "Tipo invalido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to delete menu item:", error);
    return NextResponse.json({ error: "Erro ao excluir item" }, { status: 500 });
  }
}
