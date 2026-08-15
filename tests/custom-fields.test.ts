import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOM_FIELD_LIMITS,
  normalizeCustomFields,
  validateCustomFieldAnswers,
  validateCustomFieldWrite,
} from "../src/lib/custom-fields";

const fields = [
  { id: "field-theme", label: "Tema", type: "text", required: true, options: "[]" },
  { id: "field-style", label: "Estilo", type: "select", required: true, options: '["Clássico","Moderno"]' },
  { id: "field-guests", label: "Convidados extras", type: "number", required: false, options: "[]" },
];

test("normalizes canonical persisted custom fields", () => {
  const result = normalizeCustomFields(fields);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value[1]?.options, ["Clássico", "Moderno"]);
});

test("rejects invalid or duplicate custom field definitions", () => {
  assert.equal(normalizeCustomFields([{ ...fields[0]!, type: "date" }]).ok, false);
  assert.equal(normalizeCustomFields([{ ...fields[0]!, id: "a" }, { ...fields[0]!, id: "b" }]).ok, false);
  assert.equal(validateCustomFieldWrite({ label: "Seleção", type: "select", required: false, options: [] }).ok, false);
  assert.equal(validateCustomFieldWrite({ label: "Texto", type: "text", required: false, options: ["indevida"] }).ok, false);
});

test("accepts valid tenant answers and creates historical snapshots", () => {
  const definitions = normalizeCustomFields(fields);
  assert.equal(definitions.ok, true);
  if (!definitions.ok) return;
  const result = validateCustomFieldAnswers(definitions.value, {
    "field-theme": "  Jardim encantado ",
    "field-style": "Moderno",
    "field-guests": "12",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, [
    { id: "field-theme", label: "Tema", type: "text", value: "Jardim encantado" },
    { id: "field-style", label: "Estilo", type: "select", value: "Moderno" },
    { id: "field-guests", label: "Convidados extras", type: "number", value: "12" },
  ]);
});

test("enforces the server-owned custom text boundary exactly", () => {
  const definitions = normalizeCustomFields(fields);
  assert.equal(definitions.ok, true);
  if (!definitions.ok) return;

  const boundary = validateCustomFieldAnswers(definitions.value, {
    "field-theme": "x".repeat(CUSTOM_FIELD_LIMITS.textAnswer),
    "field-style": "Clássico",
  });
  assert.equal(boundary.ok, true);
  if (boundary.ok) {
    const theme = boundary.value.find((field) => field.id === "field-theme");
    assert.equal(theme?.value.length, CUSTOM_FIELD_LIMITS.textAnswer);
  }

  const overBoundary = validateCustomFieldAnswers(definitions.value, {
    "field-theme": "x".repeat(CUSTOM_FIELD_LIMITS.textAnswer + 1),
    "field-style": "Clássico",
  });
  assert.equal(overBoundary.ok, false);
});

test("rejects missing required, forged, invalid select and invalid number answers", () => {
  const definitions = normalizeCustomFields(fields);
  assert.equal(definitions.ok, true);
  if (!definitions.ok) return;
  assert.equal(validateCustomFieldAnswers(definitions.value, { "field-style": "Moderno" }).ok, false);
  assert.equal(validateCustomFieldAnswers(definitions.value, { "field-theme": "Tema", "field-style": "Outra" }).ok, false);
  assert.equal(validateCustomFieldAnswers(definitions.value, { "field-theme": "Tema", "field-style": "Clássico", "field-guests": "abc" }).ok, false);
  assert.equal(validateCustomFieldAnswers(definitions.value, { "field-theme": "Tema", "field-style": "Clássico", "field-tenant-b": "forged" }).ok, false);
});
