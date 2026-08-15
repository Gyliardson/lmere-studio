import type { FeaturesConfig } from "./types";
import { validateFeaturesConfig, type ValidationResult } from "./admin-validation";

export const DEFAULT_FEATURES_CONFIG: FeaturesConfig = {
  allow_photo_upload: true,
  deposit_mode: "50_percent",
  custom_fields: [],
};

/**
 * Read-compatibility boundary for historical tenant feature JSON.
 * The dormant delivery flag is intentionally retired from the supported product
 * contract. Legacy custom fields that predate stable IDs receive deterministic
 * IDs so an admin can load/save them without inventing a second source of truth.
 */
export function normalizePersistedFeaturesConfig(value: unknown): ValidationResult<FeaturesConfig> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return validateFeaturesConfig(value);
  }

  const raw = value as Record<string, unknown>;
  const legacyFields = Array.isArray(raw.custom_fields)
    ? raw.custom_fields.map((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
        const item = entry as Record<string, unknown>;
        return { id: typeof item.id === "string" && item.id.trim() ? item.id : `legacy-${index + 1}`, ...item };
      })
    : raw.custom_fields;

  const { enable_delivery_step: _retiredDeliveryFlag, ...supported } = raw;
  return validateFeaturesConfig({
    ...DEFAULT_FEATURES_CONFIG,
    ...supported,
    ...(legacyFields !== undefined ? { custom_fields: legacyFields } : {}),
  });
}
