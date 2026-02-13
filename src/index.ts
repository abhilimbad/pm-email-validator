/**
 * pm-email-validator - The Explainable Email Intelligence Library
 *
 * Not just "valid" or "invalid". Understand WHY.
 *
 * @packageDocumentation
 */

// Main validation functions
export { verifyEmail, debugVerifyEmail } from "./verify.js";

// Batch validation
export {
  verifyEmailBatch,
  verifyEmailStream,
  quickCheckBatch,
  filterValidEmails,
  partitionByVerdict,
} from "./batch.js";

// Presets
export {
  PRESETS,
  PRESET_QUICK,
  PRESET_STANDARD,
  PRESET_THOROUGH,
  PRESET_B2B,
  PRESET_STRICT,
  getPreset,
  getPresetOptions,
  listPresets,
  describePresets,
} from "./presets.js";
export type { PresetName } from "./presets.js";

// Core validation modules
export { validateSyntax } from "./core/syntax.js";
export { suggestTypo, findBestMatch, isKnownDomain, suggestDomain } from "./core/typo.js";
export { checkDisposable, isDisposable, getDisposableDomainCount } from "./core/disposable.js";
export {
  loadDisposableProviderFromFile,
  createDisposableProviderFromDomains,
} from "./core/disposableFileProvider.js";
export { checkDNS } from "./core/dns.js";

// Provider intelligence
export {
  detectProvider,
  isFreeEmailProvider,
  isBusinessEmail,
  getProviderName,
} from "./core/provider.js";
export type { ProviderInfo, ProviderDetectionResult } from "./core/provider.js";

// Canonical email
export {
  getCanonicalEmail,
  isSameCanonicalEmail,
  getPlusTag,
  hasPlusAddressing,
} from "./core/canonical.js";
export type { CanonicalResult } from "./core/canonical.js";

// Role email detection
export {
  isRoleEmail,
  getRoleEmailInfo,
  isNoReplyEmail,
  isCommonlyAbusedRole,
} from "./core/roleEmail.js";
export type { RoleEmailResult } from "./core/roleEmail.js";

// Pattern detection
export {
  detectPatterns,
  getHighestSeverity,
  hasHighSeverityPatterns,
  looksLikeTestEmail,
} from "./core/patterns.js";
export type { PatternSignal, PatternSeverity, PatternType } from "./core/patterns.js";

// Catch-all detection
export { checkCatchAll, mightBeCatchAll } from "./core/catchAll.js";
export type { CatchAllResult } from "./core/catchAll.js";

// Risk aggregation
export {
  aggregateRisks,
  calculateRiskImpact,
  getHighestRiskSeverity,
  filterRisksBySeverity,
  summarizeRisks,
} from "./core/risks.js";
export type { RiskSignal, RiskSeverity, RiskSignalType, RiskAggregationInput } from "./core/risks.js";

// Data access
export { PROVIDERS, getProviderByDomain, getProviderByMx } from "./data/providers.js";
export { DISPOSABLE_DOMAINS, isDisposableDomain } from "./data/disposable.js";
export { COMMON_EMAIL_DOMAINS, PRIMARY_DOMAINS } from "./data/typo.js";
export { ROLE_EMAIL_PREFIXES, ROLE_PREFIX_SET } from "./data/roleEmails.js";

// Types
export type {
  // Core result types
  Verdict,
  PMEmailResult,
  PMEmailDetailedResult,
  DebugResult,
  DebugTraceStep,

  // Options and configuration
  VerifyOptions,
  Weights,
  DisposableProvider,
  ValidationPreset,
  BatchOptions,
  BatchResult,

  // Intelligence types
  Intelligence,
  ScoreBreakdownItem,
  RiskItem,

  // DNS types
  DnsResult,

  // Data types
  ProviderType,
  ProviderFeatures,
  ProviderDefinition,
  RoleCategory,
  RoleEmailDefinition,
} from "./types.js";
