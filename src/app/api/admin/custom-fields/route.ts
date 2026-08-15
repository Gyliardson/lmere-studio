import { Prisma } from "@prisma/client";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { CUSTOM_FIELD_LIMITS, normalizeCustomFields, validateCustomFieldWrite } from "@/lib/custom-fields";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_WRITE_RETRIES = 4;
const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
const invalidJson = () => NextResponse.json({ code: "INVALID_JSON", error: "Corpo JSON inválido" }, { status: 400 });
const validationError = (issues: Array<{ field: string; message: string }>) => NextResponse.json({ code: "VALIDATION_ERROR", error: "Dados inválidos", issues }, { status: 422 });
const duplicateLabel = () => validationError([{ field: "label", message: "já existe um campo com este rótulo" }]);
const fieldLimit = () => validationError([{ field: "$", message: `máximo de ${CUSTOM_FIELD_LIMITS.fields} campos personalizados` }]);

async function sessionTenant(request: Request) {
  const session = await getVerifiedAdminSession(request);
  return session?.tenantId ?? null;
}

async function serializedFields(tenantId: string) {
  const rows = await prisma.customField.findMany({ where: { tenantId }, orderBy: { id: "asc" } });
  const parsed = normalizeCustomFields(rows);
  if (!parsed.ok) throw new Error("Persisted custom fields violate the server contract");
  return parsed.value;
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isRetryableWriteConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function GET(request: Request) {
  try {
    const tenantId = await sessionTenant(request);
    if (!tenantId) return unauthorized();
    return NextResponse.json({ customFields: await serializedFields(tenantId) });
  } catch (error) {
    console.error("[ERROR] Failed to fetch custom fields", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar campos personalizados" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await sessionTenant(request);
    if (!tenantId) return unauthorized();
    let body: unknown;
    try { body = await request.json(); } catch { return invalidJson(); }
    const parsed = validateCustomFieldWrite(body);
    if (!parsed.ok) return validationError(parsed.issues);

    for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt += 1) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const [count, duplicate] = await Promise.all([
            tx.customField.count({ where: { tenantId } }),
            tx.customField.findFirst({ where: { tenantId, label: { equals: parsed.value.label, mode: "insensitive" } } }),
          ]);
          if (count >= CUSTOM_FIELD_LIMITS.fields) return "limit" as const;
          if (duplicate) return "duplicate" as const;

          await tx.customField.create({ data: {
            tenantId,
            label: parsed.value.label,
            type: parsed.value.type,
            required: parsed.value.required,
            options: JSON.stringify(parsed.value.options),
          } });
          return "created" as const;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        if (result === "limit") return fieldLimit();
        if (result === "duplicate") return duplicateLabel();
        return NextResponse.json({ customFields: await serializedFields(tenantId) }, { status: 201 });
      } catch (error) {
        if (isUniqueConflict(error)) return duplicateLabel();
        if (isRetryableWriteConflict(error) && attempt + 1 < MAX_WRITE_RETRIES) continue;
        if (isRetryableWriteConflict(error)) {
          return NextResponse.json({ code: "CUSTOM_FIELD_RETRY_EXHAUSTED", error: "Não foi possível atualizar campos personalizados; tente novamente" }, { status: 503 });
        }
        throw error;
      }
    }

    return NextResponse.json({ code: "CUSTOM_FIELD_RETRY_EXHAUSTED", error: "Não foi possível atualizar campos personalizados; tente novamente" }, { status: 503 });
  } catch (error) {
    if (isUniqueConflict(error)) return duplicateLabel();
    console.error("[ERROR] Failed to create custom field", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao criar campo personalizado" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await sessionTenant(request);
    if (!tenantId) return unauthorized();
    let body: unknown;
    try { body = await request.json(); } catch { return invalidJson(); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return validationError([{ field: "$", message: "deve ser um objeto" }]);
    const raw = body as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!id) return validationError([{ field: "id", message: "obrigatório" }]);
    const parsed = validateCustomFieldWrite({ label: raw.label, type: raw.type, required: raw.required, options: raw.options });
    if (!parsed.ok) return validationError(parsed.issues);

    const owned = await prisma.customField.findFirst({ where: { id, tenantId } });
    if (!owned) return NextResponse.json({ error: "Campo não encontrado" }, { status: 404 });
    const duplicate = await prisma.customField.findFirst({ where: { tenantId, label: { equals: parsed.value.label, mode: "insensitive" }, NOT: { id } } });
    if (duplicate) return duplicateLabel();

    await prisma.customField.update({ where: { id: owned.id }, data: {
      label: parsed.value.label,
      type: parsed.value.type,
      required: parsed.value.required,
      options: JSON.stringify(parsed.value.options),
    } });
    return NextResponse.json({ customFields: await serializedFields(tenantId) });
  } catch (error) {
    if (isUniqueConflict(error)) return duplicateLabel();
    console.error("[ERROR] Failed to update custom field", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar campo personalizado" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = await sessionTenant(request);
    if (!tenantId) return unauthorized();
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) return validationError([{ field: "id", message: "obrigatório" }]);
    const owned = await prisma.customField.findFirst({ where: { id, tenantId } });
    if (!owned) return NextResponse.json({ error: "Campo não encontrado" }, { status: 404 });
    await prisma.customField.delete({ where: { id: owned.id } });
    return NextResponse.json({ customFields: await serializedFields(tenantId) });
  } catch (error) {
    console.error("[ERROR] Failed to delete custom field", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao excluir campo personalizado" }, { status: 500 });
  }
}
