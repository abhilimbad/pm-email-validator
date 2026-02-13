export type Verdict = "valid" | "risky" | "unknown" | "invalid";

// Re-export types from modules for convenience
export type { ProviderType, ProviderFeatures, ProviderDefinition } from "./data/providers.js";
export type { RoleCategory, RoleEmailDefinition } from "./data/roleEmails.js";
export type { PatternSeverity, PatternType, PatternSignal } from "./core/patterns.js";
export type { RiskSeverity, RiskSignalType, RiskSignal } from "./core/risks.js";

/**
 * Provider intelligence information
 */
export interface Intelligence {
  /** Canonical email after provider-specific normalization */
  canonical: string;
  /** Detected provider ID (e.g., "google", "microsoft") */
  provider: string | null;
  /** Provider display name (e.g., "Gmail", "Outlook") */
  providerName: string;
  /** Provider type: free, business, privacy, education */
  providerType: string | null;
  /** Whether the domain is a custom/business domain */
  isCustomDomain: boolean;
  /** Whether email is from a role-based address (info@, admin@, etc.) */
  isRoleEmail: boolean;
  /** Role email category if applicable */
  roleCategory?: string;
  /** Whether email uses plus addressing */
  hasPlusAddressing: boolean;
  /** The plus tag if present */
  plusTag?: string;
  /** Number of dots removed for canonical (Gmail) */
  dotsRemoved: number;
  /** Domain classification */
  domainClassification: "free" | "business" | "privacy" | "education" | "unknown";
  /** Detected MX provider if different from domain */
  mxProvider?: string;
}

/**
 * Score breakdown item for transparency
 */
export interface ScoreBreakdownItem {
  /** The check that was performed */
  check: string;
  /** Whether the check passed */
  passed: boolean;
  /** Impact on the confidence score (negative = deduction) */
  impact: number;
  /** Optional note explaining the impact */
  note?: string;
}

/**
 * Risk signal detected during validation
 */
export interface RiskItem {
  /** Type of risk signal */
  signal: string;
  /** Human-readable description */
  description: string;
  /** Risk severity: high, medium, low */
  severity: "high" | "medium" | "low";
  /** Additional details */
  details?: string;
}

export interface PMEmailResult {
  /** Original email input */
  email: string;
  /** Normalized email (trimmed, domain lowercased) */
  normalizedEmail: string;

  /** Overall verdict */
  verdict: Verdict;
  /** Confidence score 0-100 */
  confidence: number;
  /** Human-readable reasons for the verdict */
  reasons: string[];

  /** Individual check results */
  checks: {
    syntax: { ok: boolean; mode: "basic" | "rfc"; reason?: string };
    typo: { ok: boolean; suggestedEmail?: string };
    disposable: { ok: boolean; source?: string };
    dns: {
      domainExists?: boolean;
      mx?: boolean;
      spf?: boolean;
      dmarc?: boolean;
      mxHosts?: string[];
    };
    smtp: { enabled: boolean; status: "valid" | "invalid" | "unknown"; code?: string };
    catchAll?: { checked: boolean; isCatchAll: boolean; confidence: string };
    roleEmail: { isRole: boolean; prefix?: string; category?: string };
    patterns: { detected: boolean; signals: string[] };
  };
}

/**
 * Detailed validation result (full payload).
 */
export interface PMEmailDetailedResult extends PMEmailResult {
  /** Provider intelligence data */
  intelligence: Intelligence;
  /** Risk signals detected */
  risks: RiskItem[];
  /** Score breakdown for transparency */
  scoreBreakdown: ScoreBreakdownItem[];
}

export interface DebugTraceStep {
  step: string;
  detail: string;
  data?: Record<string, unknown>;
}

export interface DebugResult {
  result: PMEmailDetailedResult;
  trace: DebugTraceStep[];
}

export interface VerifyOptions {
  /** Output shape: basic (lean) or full (detailed) */
  output?: "basic" | "full";

  /** Syntax validation mode: basic (permissive) or rfc (strict) */
  mode?: "basic" | "rfc";

  /** Enable typo suggestions */
  typoSuggestions?: boolean;

  /** Disposable email checking options */
  disposable?: { enabled?: boolean; provider?: DisposableProvider };

  /** DNS checking options */
  dns?: {
    mx?: boolean;
    spf?: boolean;
    dmarc?: boolean;
    timeoutMs?: number;
  };

  /** SMTP probing options (disabled by default) */
  smtp?: {
    enabled?: boolean;
    timeoutMs?: number;
    maxConnectionsPerDomainPerMinute?: number;
  };

  /** Catch-all domain detection options */
  catchAll?: {
    enabled?: boolean;
    timeoutMs?: number;
  };

  /** Pattern detection options */
  patterns?: {
    enabled?: boolean;
  };

  /** Role email detection options */
  roleEmail?: {
    enabled?: boolean;
  };

  /** Scoring configuration */
  scoring?: {
    weights?: Partial<Weights>;
    thresholds?: { valid: number; risky: number; unknown: number };
  };

  /** Cache configuration */
  cache?: { dnsTtlMs?: number; maxEntries?: number };

  /** Logger for debug output */
  logger?: { debug(...args: unknown[]): void; warn(...args: unknown[]): void };
}

export interface Weights {
  typo: number;
  disposable: number;
  noMx: number;
  noSpf: number;
  noDmarc: number;
  smtpInvalid: number;
  smtpUnknown: number;
  catchAll: number;
  roleEmail: number;
  patternHigh: number;
  patternMedium: number;
  patternLow: number;
  plusAddressing: number;
}

export interface DisposableProvider {
  name: string;
  has(domain: string): boolean;
}

export interface DnsResult {
  domain: string;
  domainExists: boolean;
  mx?: boolean;
  spf?: boolean;
  dmarc?: boolean;
  mxHosts?: string[];
}

/**
 * Validation preset configuration
 */
export interface ValidationPreset {
  /** Preset name */
  name: string;
  /** Preset description */
  description: string;
  /** Options to apply */
  options: VerifyOptions;
}

/**
 * Batch validation options
 */
export interface BatchOptions extends VerifyOptions {
  /** Maximum concurrent validations */
  concurrency?: number;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number) => void;
  /** Whether to continue on individual errors */
  continueOnError?: boolean;
}

/**
 * Batch validation result
 */
export interface BatchResult {
  /** Total emails processed */
  total: number;
  /** Successful validations */
  successful: number;
  /** Failed validations (errors) */
  failed: number;
  /** Individual results */
  results: Array<{
    email: string;
    result?: PMEmailResult;
    error?: string;
  }>;
  /** Processing duration in milliseconds */
  durationMs: number;
}
