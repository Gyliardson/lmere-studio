import type { FeaturesConfig } from "./types";
import { validateFeaturesConfig, type ValidationResult } from "./admin-validation";

export const DEFAULT_FEATURES_CONFIG: FeaturesConfig = {
  allow_photo_upload: true,
  deposit_mode: "50_percent",
  enable_delivery_step: false,
  custom_fields: [],
};

/**
 * Compatibility boundary for historical JSON. `enable_delivery_step` never had
 * product behavior and is retired to false. `custom_fields` is no longer an
 * effective source: canonical definitions live in Tenant.customFields. Keeping
 * the legacy keys normalized here lets old rows remain readable while preventing
 * two competing runtime sources of truth.
 */
export function normalizePersistedFeaturesConfig(value: unknown): ValidationResult<FeaturesConfig> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return validateFeaturesConfig(value);
  }

  const parsed = validateFeaturesConfig({
    ...DEFAULT_FEATURES_CONFIG,
    ...(value as Record<string, unknown>),
  });
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: {
      ...parsed.value,
      enable_delivery_step: false,
      custom_fields: [],
    },
  };
}
