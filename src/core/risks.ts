/**
 * Risk signals aggregation module.
 * Collects and categorizes all risk signals for an email.
 */

import { detectPatterns, PatternSignal, PatternSeverity } from "./patterns.js";
import { isRoleEmail, RoleEmailResult } from "./roleEmail.js";
import { hasPlusAddressing, CanonicalResult } from "./canonical.js";

export type RiskSeverity = "high" | "medium" | "low";

export type RiskSignalType =
  | "disposable_domain"
  | "free_provider"
  | "role_email"
  | "plus_addressing"
  | "pattern_suspicious"
  | "no_mx_records"
  | "no_spf"
  | "no_dmarc"
  | "smtp_invalid"
  | "smtp_unknown"
  | "catch_all"
  | "typo_domain"
  | "custom_domain"
  | "dots_in_gmail"
  | "numeric_local"
  | "short_local"
  | "gibberish_local";

export interface RiskSignal {
  /** Type of risk signal */
  signal: RiskSignalType;
  /** Human-readable description */
  description: string;
  /** Risk severity */
  severity: RiskSeverity;
  /** Additional details or matched pattern */
  details?: string;
  /** Impact on confidence score */
  scoreImpact: number;
}

/**
 * Map pattern severity to risk severity
 */
function patternToRiskSeverity(severity: PatternSeverity): RiskSeverity {
  return severity; // They use the same values
}

/**
 * Convert pattern signals to risk signals
 */
function patternsToRisks(patterns: PatternSignal[]): RiskSignal[] {
  return patterns.map((p) => {
    let signal: RiskSignalType;
    let impact: number;

    switch (p.type) {
      case "keyboard_walk":
        signal = "pattern_suspicious";
        impact = -20;
        break;
      case "test_pattern":
        signal = "pattern_suspicious";
        impact = -25;
        break;
      case "sequential":
        signal = "pattern_suspicious";
        impact = -10;
        break;
      case "repeated_chars":
        signal = "pattern_suspicious";
        impact = -10;
        break;
      case "gibberish":
        signal = "gibberish_local";
        impact = -15;
        break;
      case "numeric_only":
        signal = "numeric_local";
        impact = -5;
        break;
      case "too_short":
        signal = "short_local";
        impact = -5;
        break;
      default:
        signal = "pattern_suspicious";
        impact = -5;
    }

    return {
      signal,
      description: p.description,
      severity: patternToRiskSeverity(p.severity),
      details: p.match,
      scoreImpact: impact,
    };
  });
}

export interface RiskAggregationInput {
  /** Email being analyzed */
  email: string;
  /** Local part of email */
  localPart: string;
  /** Domain of email */
  domain: string;
  /** Canonical email result */
  canonical?: CanonicalResult;
  /** Provider detection result */
  provider?: {
    id: string | null;
    isFreeProvider: boolean;
    isCustomDomain: boolean;
  };
  /** DNS check results */
  dns?: {
    mx: boolean;
    spf: boolean;
    dmarc: boolean;
  };
  /** SMTP check result */
  smtp?: {
    status: "valid" | "invalid" | "unknown";
  };
  /** Disposable check result */
  disposable?: {
    isDisposable: boolean;
  };
  /** Typo check result */
  typo?: {
    hasSuggestion: boolean;
    suggestion?: string;
  };
  /** Catch-all check result */
  catchAll?: {
    isCatchAll: boolean;
  };
}

/**
 * Aggregate all risk signals for an email.
 */
export function aggregateRisks(input: RiskAggregationInput): RiskSignal[] {
  const risks: RiskSignal[] = [];

  // Pattern-based risks (gibberish, keyboard walks, test emails)
  const patterns = detectPatterns(input.localPart);
  risks.push(...patternsToRisks(patterns));

  // Role email risk
  const roleResult = isRoleEmail(input.localPart);
  if (roleResult.isRole) {
    risks.push({
      signal: "role_email",
      description: `Role email address (${roleResult.category})`,
      severity: roleResult.commonlyAbused ? "medium" : "low",
      details: roleResult.prefix,
      scoreImpact: roleResult.commonlyAbused ? -10 : -5,
    });
  }

  // Plus addressing
  if (input.canonical?.normalization.plusTagRemoved) {
    risks.push({
      signal: "plus_addressing",
      description: "Uses plus addressing",
      severity: "low",
      details: `+${input.canonical.normalization.plusTag}`,
      scoreImpact: -3,
    });
  }

  // Dots in Gmail (informational, not really a risk)
  if (input.canonical?.normalization.dotsRemoved && input.canonical.normalization.dotsRemoved > 0) {
    if (input.provider?.id === "google" || input.provider?.id === "googleWorkspace") {
      risks.push({
        signal: "dots_in_gmail",
        description: "Gmail dots in local part (cosmetic only)",
        severity: "low",
        details: `${input.canonical.normalization.dotsRemoved} dots removed`,
        scoreImpact: 0, // No impact, just informational
      });
    }
  }

  // Disposable domain
  if (input.disposable?.isDisposable) {
    risks.push({
      signal: "disposable_domain",
      description: "Disposable/temporary email domain",
      severity: "high",
      scoreImpact: -60,
    });
  }

  // Free provider (not necessarily a risk, but useful info)
  if (input.provider?.isFreeProvider) {
    risks.push({
      signal: "free_provider",
      description: "Free email provider",
      severity: "low",
      details: input.provider.id || undefined,
      scoreImpact: 0, // No penalty, just informational
    });
  }

  // Custom domain (business indicator, not a risk)
  if (input.provider?.isCustomDomain) {
    risks.push({
      signal: "custom_domain",
      description: "Custom/business domain",
      severity: "low",
      scoreImpact: 0, // Actually positive, but we don't add points
    });
  }

  // DNS-related risks
  if (input.dns) {
    if (!input.dns.mx) {
      risks.push({
        signal: "no_mx_records",
        description: "Domain has no MX records",
        severity: "high",
        scoreImpact: -50,
      });
    }

    if (!input.dns.spf) {
      risks.push({
        signal: "no_spf",
        description: "Domain has no SPF record",
        severity: "low",
        scoreImpact: -10,
      });
    }

    if (!input.dns.dmarc) {
      risks.push({
        signal: "no_dmarc",
        description: "Domain has no DMARC record",
        severity: "low",
        scoreImpact: -10,
      });
    }
  }

  // SMTP-related risks
  if (input.smtp) {
    if (input.smtp.status === "invalid") {
      risks.push({
        signal: "smtp_invalid",
        description: "SMTP verification failed - address rejected",
        severity: "high",
        scoreImpact: -80,
      });
    } else if (input.smtp.status === "unknown") {
      risks.push({
        signal: "smtp_unknown",
        description: "SMTP verification inconclusive",
        severity: "low",
        scoreImpact: -5,
      });
    }
  }

  // Catch-all domain
  if (input.catchAll?.isCatchAll) {
    risks.push({
      signal: "catch_all",
      description: "Domain accepts all addresses (catch-all)",
      severity: "medium",
      details: "SMTP verification less reliable",
      scoreImpact: -10,
    });
  }

  // Typo domain
  if (input.typo?.hasSuggestion) {
    risks.push({
      signal: "typo_domain",
      description: "Domain may be a typo",
      severity: "medium",
      details: `Did you mean ${input.typo.suggestion}?`,
      scoreImpact: -25,
    });
  }

  return risks;
}

/**
 * Calculate total score impact from risks.
 */
export function calculateRiskImpact(risks: RiskSignal[]): number {
  return risks.reduce((sum, r) => sum + r.scoreImpact, 0);
}

/**
 * Get highest severity from risks.
 */
export function getHighestRiskSeverity(risks: RiskSignal[]): RiskSeverity | null {
  if (risks.length === 0) return null;

  if (risks.some((r) => r.severity === "high")) return "high";
  if (risks.some((r) => r.severity === "medium")) return "medium";
  return "low";
}

/**
 * Filter risks by severity.
 */
export function filterRisksBySeverity(
  risks: RiskSignal[],
  minSeverity: RiskSeverity
): RiskSignal[] {
  const severityOrder: Record<RiskSeverity, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const minLevel = severityOrder[minSeverity];
  return risks.filter((r) => severityOrder[r.severity] >= minLevel);
}

/**
 * Get a summary of risks for display.
 */
export function summarizeRisks(risks: RiskSignal[]): string[] {
  // Filter out informational items (scoreImpact === 0)
  const meaningful = risks.filter((r) => r.scoreImpact !== 0);

  return meaningful.map((r) => {
    if (r.details) {
      return `${r.description}: ${r.details}`;
    }
    return r.description;
  });
}
