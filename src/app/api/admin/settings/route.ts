import {
  validateTenantSettingsUpdate,
  type ValidationIssue,
} from "@/lib/admin-validation";
import { getVerifiedAdminSession } from "@/lib/admin-session";
import { meetsContrast, WCAG_AA_LARGE_TEXT, WCAG_AA_NORMAL_TEXT } from "@/lib/color-contrast";
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

function contrastIssues(theme: { backgroundColor: string; textColor: string; buttonColor: string }): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!meetsContrast(theme.textColor, theme.backgroundColor, WCAG_AA_NORMAL_TEXT)) {
    issues.push({ field: "textColor", message: "texto e fundo precisam atingir contraste AA de 4.5:1" });
  }
  if (!meetsContrast("#FFFFFF", theme.buttonColor, WCAG_AA_LARGE_TEXT)) {
    issues.push({ field: "buttonColor", message: "botões precisam atingir contraste mínimo de 3:1 com o texto claro" });
  }
  return issues;
}

export async function GET(request: Request) {
  try {
    const session = await getVerifiedAdminSession(request);
    if (!session) return unauthorized();

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      omit: { adminPasswordHash: true, adminSessionVersion: true },
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
    const session = await getVerifiedAdminSession(request);
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

    const currentTheme = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { backgroundColor: true, textColor: true, buttonColor: true },
    });
    if (!currentTheme) return unauthorized();

    const theme = {
      backgroundColor: parsed.value.backgroundColor ?? currentTheme.backgroundColor,
      textColor: parsed.value.textColor ?? currentTheme.textColor,
      buttonColor: parsed.value.buttonColor ?? currentTheme.buttonColor,
    };
    const unsafeContrast = contrastIssues(theme);
    if (unsafeContrast.length) return validationError(unsafeContrast);

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: parsed.value,
      omit: { adminPasswordHash: true, adminSessionVersion: true },
    });

    return NextResponse.json({ settings: serializeSettings(tenant) });
  } catch (error) {
    console.error("[ERROR] Failed to update admin settings", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 });
  }
}
