/**
 * Validation presets for common use cases.
 * Presets provide pre-configured options for different validation scenarios.
 */

import { ValidationPreset, VerifyOptions } from "./types.js";
import { DEFAULT_THRESHOLDS } from "./core/scoring.js";

/**
 * Quick validation - syntax and basic checks only.
 * Fastest option, suitable for real-time form validation.
 */
export const PRESET_QUICK: ValidationPreset = {
  name: "quick",
  description: "Fast validation with syntax and basic checks only",
  options: {
    mode: "basic",
    typoSuggestions: true,
    disposable: { enabled: true },
    dns: { mx: false, spf: false, dmarc: false },
    smtp: { enabled: false },
    catchAll: { enabled: false },
    patterns: { enabled: true },
    roleEmail: { enabled: true },
  },
};

/**
 * Standard validation - balanced speed and thoroughness.
 * Good default for most use cases.
 */
export const PRESET_STANDARD: ValidationPreset = {
  name: "standard",
  description: "Balanced validation with DNS checks",
  options: {
    mode: "basic",
    typoSuggestions: true,
    disposable: { enabled: true },
    dns: { mx: true, spf: true, dmarc: true, timeoutMs: 4000 },
    smtp: { enabled: false },
    catchAll: { enabled: false },
    patterns: { enabled: true },
    roleEmail: { enabled: true },
  },
};

/**
 * Thorough validation - includes SMTP verification.
 * Most accurate but slower, use for important signups.
 */
export const PRESET_THOROUGH: ValidationPreset = {
  name: "thorough",
  description: "Comprehensive validation including SMTP verification",
  options: {
    mode: "rfc",
    typoSuggestions: true,
    disposable: { enabled: true },
    dns: { mx: true, spf: true, dmarc: true, timeoutMs: 5000 },
    smtp: { enabled: true, timeoutMs: 5000, maxConnectionsPerDomainPerMinute: 10 },
    catchAll: { enabled: true, timeoutMs: 5000 },
    patterns: { enabled: true },
    roleEmail: { enabled: true },
  },
};

/**
 * B2B validation - optimized for business email addresses.
 * Stricter on free providers and role emails.
 */
export const PRESET_B2B: ValidationPreset = {
  name: "b2b",
  description: "Optimized for business email validation",
  options: {
    mode: "rfc",
    typoSuggestions: true,
    disposable: { enabled: true },
    dns: { mx: true, spf: true, dmarc: true, timeoutMs: 5000 },
    smtp: { enabled: true, timeoutMs: 5000, maxConnectionsPerDomainPerMinute: 10 },
    catchAll: { enabled: true, timeoutMs: 5000 },
    patterns: { enabled: true },
    roleEmail: { enabled: true },
    scoring: {
      weights: {
        // Penalize free providers more heavily for B2B
        patternHigh: 25,
        roleEmail: 15,
      },
    },
  },
};

/**
 * Strict validation - RFC-compliant syntax, all checks enabled.
 * Most restrictive option.
 */
export const PRESET_STRICT: ValidationPreset = {
  name: "strict",
  description: "Strictest validation with RFC-compliant syntax",
  options: {
    mode: "rfc",
    typoSuggestions: true,
    disposable: { enabled: true },
    dns: { mx: true, spf: true, dmarc: true, timeoutMs: 5000 },
    smtp: { enabled: true, timeoutMs: 5000, maxConnectionsPerDomainPerMinute: 10 },
    catchAll: { enabled: true, timeoutMs: 5000 },
    patterns: { enabled: true },
    roleEmail: { enabled: true },
    scoring: {
      thresholds: {
        valid: 90,
        risky: 70,
        unknown: 40,
      },
    },
  },
};

/**
 * All available presets.
 */
export const PRESETS = {
  quick: PRESET_QUICK,
  standard: PRESET_STANDARD,
  thorough: PRESET_THOROUGH,
  b2b: PRESET_B2B,
  strict: PRESET_STRICT,
} as const;

export type PresetName = keyof typeof PRESETS;

/**
 * Get a preset by name.
 */
export function getPreset(name: PresetName): ValidationPreset {
  return PRESETS[name];
}

/**
 * Get options from a preset, optionally merged with custom options.
 */
export function getPresetOptions(name: PresetName, overrides?: Partial<VerifyOptions>): VerifyOptions {
  const preset = PRESETS[name];
  if (!overrides) {
    return preset.options;
  }

  const presetThresholds = preset.options.scoring?.thresholds;
  const overrideThresholds = overrides.scoring?.thresholds;
  const mergedThresholds = {
    valid: overrideThresholds?.valid ?? presetThresholds?.valid ?? DEFAULT_THRESHOLDS.valid,
    risky: overrideThresholds?.risky ?? presetThresholds?.risky ?? DEFAULT_THRESHOLDS.risky,
    unknown: overrideThresholds?.unknown ?? presetThresholds?.unknown ?? DEFAULT_THRESHOLDS.unknown,
  };

  // Deep merge options
  return {
    ...preset.options,
    ...overrides,
    dns: {
      ...preset.options.dns,
      ...overrides.dns,
    },
    smtp: {
      ...preset.options.smtp,
      ...overrides.smtp,
    },
    catchAll: {
      ...preset.options.catchAll,
      ...overrides.catchAll,
    },
    patterns: {
      ...preset.options.patterns,
      ...overrides.patterns,
    },
    roleEmail: {
      ...preset.options.roleEmail,
      ...overrides.roleEmail,
    },
    scoring: {
      ...preset.options.scoring,
      ...overrides.scoring,
      weights: {
        ...preset.options.scoring?.weights,
        ...overrides.scoring?.weights,
      },
      thresholds: mergedThresholds,
    },
    cache: {
      ...preset.options.cache,
      ...overrides.cache,
    },
  };
}

/**
 * List all available preset names.
 */
export function listPresets(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}

/**
 * Get description of all presets.
 */
export function describePresets(): Array<{ name: PresetName; description: string }> {
  return Object.entries(PRESETS).map(([name, preset]) => ({
    name: name as PresetName,
    description: preset.description,
  }));
}
