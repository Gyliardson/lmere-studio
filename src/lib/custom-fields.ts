import type { CustomFieldData, CustomFieldSnapshot } from "./types";

export const CUSTOM_FIELD_LIMITS = {
  fields: 20,
  label: 80,
  options: 50,
  option: 80,
  textAnswer: 500,
  numberAnswer: 64,
} as const;

export type CustomFieldIssue = { field: string; message: string };
export type CustomFieldResult<T> = { ok: true; value: T } | { ok: false; issues: CustomFieldIssue[] };

type PersistedCustomField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string;
};

function issue(issues: CustomFieldIssue[], field: string, message: string) {
  issues.push({ field, message });
}

export function normalizeCustomField(row: PersistedCustomField): CustomFieldResult<CustomFieldData> {
  const issues: CustomFieldIssue[] = [];
  const id = row.id.trim();
  const label = row.label.trim();
  if (!id || id.length > 100) issue(issues, "id", "identificador inválido");
  if (!label || label.length > CUSTOM_FIELD_LIMITS.label) issue(issues, "label", `deve ter entre 1 e ${CUSTOM_FIELD_LIMITS.label} caracteres`);
  if (!["text", "select", "number"].includes(row.type)) issue(issues, "type", "tipo suportado: text, select, number");

  let options: string[] = [];
  try {
    const parsed = JSON.parse(row.options) as unknown;
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
      issue(issues, "options", "opções persistidas inválidas");
    } else {
      options = parsed.map((value) => value.trim());
      if (options.length > CUSTOM_FIELD_LIMITS.options) issue(issues, "options", `máximo de ${CUSTOM_FIELD_LIMITS.options} opções`);
      if (options.some((value) => !value || value.length > CUSTOM_FIELD_LIMITS.option)) issue(issues, "options", "opção vazia ou longa demais");
      if (new Set(options.map((value) => value.toLocaleLowerCase("pt-BR"))).size !== options.length) issue(issues, "options", "opções não podem se repetir");
    }
  } catch {
    issue(issues, "options", "opções persistidas inválidas");
  }

  if (row.type === "select" && options.length === 0) issue(issues, "options", "select exige ao menos uma opção");
  if (row.type !== "select" && options.length > 0) issue(issues, "options", "somente campos select aceitam opções");

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: { id, label, type: row.type as CustomFieldData["type"], required: row.required, options } };
}

export function normalizeCustomFields(rows: PersistedCustomField[]): CustomFieldResult<CustomFieldData[]> {
  if (rows.length > CUSTOM_FIELD_LIMITS.fields) return { ok: false, issues: [{ field: "customFields", message: `máximo de ${CUSTOM_FIELD_LIMITS.fields} campos` }] };
  const issues: CustomFieldIssue[] = [];
  const values: CustomFieldData[] = [];
  for (const [index, row] of rows.entries()) {
    const parsed = normalizeCustomField(row);
    if (!parsed.ok) issues.push(...parsed.issues.map((entry) => ({ field: `customFields.${index}.${entry.field}`, message: entry.message })));
    else values.push(parsed.value);
  }
  const labels = values.map((field) => field.label.toLocaleLowerCase("pt-BR"));
  if (new Set(labels).size !== labels.length) issue(issues, "customFields", "rótulos não podem se repetir");
  return issues.length ? { ok: false, issues } : { ok: true, value: values };
}

export function validateCustomFieldWrite(input: unknown): CustomFieldResult<Omit<CustomFieldData, "id">> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, issues: [{ field: "$", message: "deve ser um objeto" }] };
  const raw = input as Record<string, unknown>;
  const issues: CustomFieldIssue[] = [];
  const allowed = new Set(["label", "type", "required", "options"]);
  for (const key of Object.keys(raw)) if (!allowed.has(key)) issue(issues, key, "campo não suportado");
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const type = raw.type;
  const required = raw.required;
  if (!label || label.length > CUSTOM_FIELD_LIMITS.label) issue(issues, "label", `deve ter entre 1 e ${CUSTOM_FIELD_LIMITS.label} caracteres`);
  if (type !== "text" && type !== "select" && type !== "number") issue(issues, "type", "tipo suportado: text, select, number");
  if (typeof required !== "boolean") issue(issues, "required", "deve ser booleano");

  let options: string[] = [];
  if (raw.options !== undefined) {
    if (!Array.isArray(raw.options) || raw.options.some((value) => typeof value !== "string")) issue(issues, "options", "deve ser uma lista de textos");
    else options = raw.options.map((value) => (value as string).trim());
  }
  if (options.length > CUSTOM_FIELD_LIMITS.options) issue(issues, "options", `máximo de ${CUSTOM_FIELD_LIMITS.options} opções`);
  if (options.some((value) => !value || value.length > CUSTOM_FIELD_LIMITS.option)) issue(issues, "options", "opção vazia ou longa demais");
  if (new Set(options.map((value) => value.toLocaleLowerCase("pt-BR"))).size !== options.length) issue(issues, "options", "opções não podem se repetir");
  if (type === "select" && options.length === 0) issue(issues, "options", "select exige ao menos uma opção");
  if (type !== "select" && options.length > 0) issue(issues, "options", "somente campos select aceitam opções");

  if (issues.length || (type !== "text" && type !== "select" && type !== "number") || typeof required !== "boolean") return { ok: false, issues };
  return { ok: true, value: { label, type, required, options } };
}

export function validateCustomFieldAnswers(definitions: CustomFieldData[], input: unknown): CustomFieldResult<CustomFieldSnapshot[]> {
  const raw = input == null ? {} : input;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, issues: [{ field: "customFieldAnswers", message: "deve ser um objeto" }] };
  const answers = raw as Record<string, unknown>;
  const issues: CustomFieldIssue[] = [];
  const definitionIds = new Set(definitions.map((field) => field.id));
  for (const key of Object.keys(answers)) if (!definitionIds.has(key)) issue(issues, `customFieldAnswers.${key}`, "campo desconhecido para este tenant");

  const snapshot: CustomFieldSnapshot[] = [];
  for (const definition of definitions) {
    const rawValue = answers[definition.id];
    if (rawValue !== undefined && typeof rawValue !== "string") {
      issue(issues, `customFieldAnswers.${definition.id}`, "resposta deve ser texto");
      continue;
    }
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (definition.required && !value) issue(issues, `customFieldAnswers.${definition.id}`, "campo obrigatório");
    if (!value) continue;

    if (definition.type === "text" && value.length > CUSTOM_FIELD_LIMITS.textAnswer) issue(issues, `customFieldAnswers.${definition.id}`, `máximo de ${CUSTOM_FIELD_LIMITS.textAnswer} caracteres`);
    if (definition.type === "number") {
      if (value.length > CUSTOM_FIELD_LIMITS.numberAnswer || !Number.isFinite(Number(value))) issue(issues, `customFieldAnswers.${definition.id}`, "número inválido");
    }
    if (definition.type === "select" && !definition.options.includes(value)) issue(issues, `customFieldAnswers.${definition.id}`, "opção inválida");
    snapshot.push({ id: definition.id, label: definition.label, type: definition.type, value });
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: snapshot };
}
