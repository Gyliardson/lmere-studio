import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FEATURES_CONFIG, normalizePersistedFeaturesConfig } from "../src/lib/features-config";

test("legacy empty feature config normalizes to the complete product defaults", () => {
  const result = normalizePersistedFeaturesConfig({});
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, DEFAULT_FEATURES_CONFIG);
});

test("legacy partial known config preserves explicit values and fills missing keys", () => {
  const result = normalizePersistedFeaturesConfig({ deposit_mode: "100_percent" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.deposit_mode, "100_percent");
    assert.equal(result.value.allow_photo_upload, true);
    assert.equal(result.value.enable_delivery_step, false);
    assert.deepEqual(result.value.custom_fields, []);
  }
});

test("persisted config does not normalize unsupported or invalid explicit values", () => {
  const unknown = normalizePersistedFeaturesConfig({ experimental_flag: true });
  assert.equal(unknown.ok, false);

  const invalid = normalizePersistedFeaturesConfig({ deposit_mode: "fixed" });
  assert.equal(invalid.ok, false);

  const malformed = normalizePersistedFeaturesConfig("not-json-object");
  assert.equal(malformed.ok, false);
});
