import type { FeaturesConfig } from "./types";
import { validateFeaturesConfig, type ValidationResult } from "./admin-validation";

export const DEFAULT_FEATURES_CONFIG: FeaturesConfig = {
  allow_photo_upload: true,
  deposit_mode: "50_percent",
  enable_delivery_step: false,
  custom_fields: [],
};

/**
 * Read-compatibility boundary for tenants created before the complete feature
 * contract became the database default. Missing known keys receive the product
 * defaults, but unknown keys and invalid present values still fail validation.
 *
 * Admin writes intentionally do not use this function: new authoritative writes
 * must provide the complete strict contract through validateFeaturesConfig().
 */
export function normalizePersistedFeaturesConfig(value: unknown): ValidationResult<FeaturesConfig> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return validateFeaturesConfig(value);
  }

  return validateFeaturesConfig({
    ...DEFAULT_FEATURES_CONFIG,
    ...(value as Record<string, unknown>),
  });
}
