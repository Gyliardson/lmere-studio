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
 * effective source: canonical definitions live in Tenant.customFields. Retired
 * keys are discarded before validating the still-supported contract, so stale
 * legacy payloads cannot become a second source of truth or break an otherwise
 * valid tenant configuration.
 */
export function normalizePersistedFeaturesConfig(value: unknown): ValidationResult<FeaturesConfig> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return validateFeaturesConfig(value);
  }

  const raw = value as Record<string, unknown>;
  const { custom_fields: _retiredCustomFields, enable_delivery_step: _retiredDeliveryFlag, ...supported } = raw;
  const parsed = validateFeaturesConfig({
    ...DEFAULT_FEATURES_CONFIG,
    ...supported,
    enable_delivery_step: false,
    custom_fields: [],
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
