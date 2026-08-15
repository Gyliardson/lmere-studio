import { getVerifiedAdminSession } from "@/lib/admin-session";
import { validateMenuCreate, validateMenuUpdate, type ValidationIssue } from "@/lib/admin-validation";
import { validateImageReference } from "@/lib/image-reference";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
const notFound = () => NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
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

function boundedImage(value: string | undefined): { ok: true; value?: string } | { ok: false; response: NextResponse } {
  if (value === undefined) return { ok: true };
  const result = validateImageReference(value);
  if (!result.ok) {
    return { ok: false, response: validationError([{ field: "imageUrl", message: result.message }]) };
  }
  return { ok: true, value: result.value };
}

export async function GET(request: Request) {
  try {
    const session = await getVerifiedAdminSession(request);
    if (!session) return unauthorized();

    const [sizes, flavors, addons] = await Promise.all([
      prisma.cakeSize.findMany({ where: { tenantId: session.tenantId }, orderBy: { sortOrder: "asc" } }),
      prisma.cakeFlavor.findMany({ where: { tenantId: session.tenantId }, orderBy: { sortOrder: "asc" } }),
      prisma.addon.findMany({ where: { tenantId: session.tenantId }, orderBy: { sortOrder: "asc" } }),
    ]);

    return NextResponse.json({ sizes, flavors, addons });
  } catch (error) {
    console.error("[ERROR] Failed to fetch admin menu", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar cardápio" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getVerifiedAdminSession(request);
    if (!session) return unauthorized();

    const body = await jsonBody(request);
    if (!body.ok) return invalidJson();
    const parsed = validateMenuCreate(body.value);
    if (!parsed.ok) return validationError(parsed.issues);

    let item;
    switch (parsed.value.itemType) {
      case "size":
        item = await prisma.cakeSize.create({ data: { tenantId: session.tenantId, ...parsed.value.data } });
        break;
      case "flavor": {
        const image = boundedImage(parsed.value.data.imageUrl);
        if (!image.ok) return image.response;
        item = await prisma.cakeFlavor.create({ data: { tenantId: session.tenantId, ...parsed.value.data, imageUrl: image.value ?? "" } });
        break;
      }
      case "addon": {
        const image = boundedImage(parsed.value.data.imageUrl);
        if (!image.ok) return image.response;
        item = await prisma.addon.create({ data: { tenantId: session.tenantId, ...parsed.value.data, imageUrl: image.value ?? "" } });
        break;
      }
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to create admin menu item", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao criar item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getVerifiedAdminSession(request);
    if (!session) return unauthorized();

    const body = await jsonBody(request);
    if (!body.ok) return invalidJson();
    const parsed = validateMenuUpdate(body.value);
    if (!parsed.ok) return validationError(parsed.issues);

    let item;
    switch (parsed.value.itemType) {
      case "size": {
        const owned = await prisma.cakeSize.findFirst({ where: { id: parsed.value.id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        item = await prisma.cakeSize.update({ where: { id: owned.id }, data: parsed.value.data });
        break;
      }
      case "flavor": {
        const image = boundedImage(parsed.value.data.imageUrl);
        if (!image.ok) return image.response;
        const owned = await prisma.cakeFlavor.findFirst({ where: { id: parsed.value.id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        item = await prisma.cakeFlavor.update({
          where: { id: owned.id },
          data: { ...parsed.value.data, ...(image.value === undefined ? {} : { imageUrl: image.value }) },
        });
        break;
      }
      case "addon": {
        const image = boundedImage(parsed.value.data.imageUrl);
        if (!image.ok) return image.response;
        const owned = await prisma.addon.findFirst({ where: { id: parsed.value.id, tenantId: session.tenantId }, select: { id: true } });
        if (!owned) return notFound();
        item = await prisma.addon.update({
          where: { id: owned.id },
          data: { ...parsed.value.data, ...(image.value === undefined ? {} : { imageUrl: image.value }) },
        });
        break;
      }
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[ERROR] Failed to update admin menu item", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getVerifiedAdminSession(request);
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
        return validationError([{ field: "type", message: "valor suportado: size, flavor, addon" }]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to delete admin menu item", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao excluir item" }, { status: 500 });
  }
}