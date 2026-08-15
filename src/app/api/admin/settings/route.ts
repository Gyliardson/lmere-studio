import {
  validateTenantSettingsUpdate,
  type ValidationIssue,
} from "@/lib/admin-validation";
import { getAdminSession } from "@/lib/admin-session";
import { normalizePersistedFeaturesConfig } from "@/lib/features-config";
import { validateImageReference } from "@/lib/image-reference";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const unauthorized = () => NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
const invalidJson = () => NextResponse.json({ code: "INVALID_JSON", error: "Corpo JSON inválido" }, { status: 400 });
const validationError = (issues: ValidationIssue[]) => NextResponse.json({
  code: "VALIDATION_ERROR",
  error: "Dados inválidos",
  issues,
}, { status: 422 });

function serializeSettings(tenant: {
  shadowColor: string;
  primaryColor: string;
  featuresConfig: string;
  [key: string]: unknown;
}) {
  const rawFeatures = JSON.parse(tenant.featuresConfig) as unknown;
  const parsedFeatures = normalizePersistedFeaturesConfig(rawFeatures);
  if (!parsedFeatures.ok) throw new Error("Persisted featuresConfig violates the server contract");
  return {
    ...tenant,
    shadowColor: tenant.shadowColor || tenant.primaryColor || "#8B5CF6",
    featuresConfig: parsedFeatures.value,
  };
}

function imageIssues(updates: { logoUrl?: string; bannerUrl?: string }): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of ["logoUrl", "bannerUrl"] as const) {
    if (updates[field] === undefined) continue;
    const result = validateImageReference(updates[field]);
    if (!result.ok) issues.push({ field, message: result.message });
    else updates[field] = result.value;
  }
  return issues;
}

export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      omit: { adminPasswordHash: true },
    });
    if (!tenant) return unauthorized();

    return NextResponse.json({ settings: serializeSettings(tenant) });
  } catch (error) {
    console.error("[ERROR] Failed to fetch admin settings", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) return unauthorized();

    let rawUpdates: unknown;
    try {
      rawUpdates = await request.json();
    } catch {
      return invalidJson();
    }

    const parsed = validateTenantSettingsUpdate(rawUpdates);
    if (!parsed.ok) return validationError(parsed.issues);
    const boundedImageIssues = imageIssues(parsed.value);
    if (boundedImageIssues.length) return validationError(boundedImageIssues);

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: parsed.value,
      omit: { adminPasswordHash: true },
    });

    return NextResponse.json({ settings: serializeSettings(tenant) });
  } catch (error) {
    console.error("[ERROR] Failed to update admin settings", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}