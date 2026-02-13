import {
  PMEmailResult,
  PMEmailDetailedResult,
  VerifyOptions,
  Weights,
  DebugResult,
  DebugTraceStep,
  Intelligence,
  RiskItem,
  ScoreBreakdownItem,
} from "./types.js";
import { normalizeEmail } from "./core/normalize.js";
import { validateSyntax } from "./core/syntax.js";
import { suggestTypo } from "./core/typo.js";
import { checkDisposable } from "./core/disposable.js";
import { checkDNS } from "./core/dns.js";
import { DnsCache } from "./core/cache.js";
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, clampScore, computeVerdict } from "./core/scoring.js";
import { probeSmtp } from "./core/smtp.js";
import { RateLimiter } from "./core/limiter.js";
import { detectProvider, getProviderName } from "./core/provider.js";
import { getCanonicalEmail } from "./core/canonical.js";
import { isRoleEmail } from "./core/roleEmail.js";
import { detectPatterns, getHighestSeverity } from "./core/patterns.js";
import { checkCatchAll } from "./core/catchAll.js";

const limiterPool = new Map<number, RateLimiter>();
const dnsCachePool = new Map<string, DnsCache>();

type DnsOptionsResolved = {
  mx: boolean;
  spf: boolean;
  dmarc: boolean;
  timeoutMs: number;
};

type SmtpOptionsResolved = {
  enabled: boolean;
  timeoutMs: number;
  maxConnectionsPerDomainPerMinute: number;
};

type RuntimeOptions = {
  mode: "basic" | "rfc";
  typoSuggestions: boolean;
  disposableEnabled: boolean;
  patternsEnabled: boolean;
  roleEmailEnabled: boolean;
  catchAllEnabled: boolean;
  dnsOpts: DnsOptionsResolved;
  smtpOpts: SmtpOptionsResolved;
};

function resolveOptions(options: VerifyOptions): RuntimeOptions {
  return {
    mode: options.mode ?? "basic",
    typoSuggestions: options.typoSuggestions ?? true,
    disposableEnabled: options.disposable?.enabled ?? true,
    patternsEnabled: options.patterns?.enabled ?? true,
    roleEmailEnabled: options.roleEmail?.enabled ?? true,
    catchAllEnabled: options.catchAll?.enabled ?? false,
    dnsOpts: {
      mx: options.dns?.mx ?? true,
      spf: options.dns?.spf ?? true,
      dmarc: options.dns?.dmarc ?? true,
      timeoutMs: options.dns?.timeoutMs ?? 4000,
    },
    smtpOpts: {
      enabled: options.smtp?.enabled ?? false,
      timeoutMs: options.smtp?.timeoutMs ?? 4000,
      maxConnectionsPerDomainPerMinute: options.smtp?.maxConnectionsPerDomainPerMinute ?? 10,
    },
  };
}

function createDnsCache(options: VerifyOptions): DnsCache {
  const ttlMs = options.cache?.dnsTtlMs ?? 10 * 60 * 1000;
  const maxEntries = options.cache?.maxEntries ?? 2000;
  const key = `${ttlMs}:${maxEntries}`;
  const existing = dnsCachePool.get(key);
  if (existing) return existing;
  const created = new DnsCache({ ttlMs, maxEntries });
  dnsCachePool.set(key, created);
  return created;
}

function createInitialChecks(mode: "basic" | "rfc", smtpEnabled: boolean): PMEmailResult["checks"] {
  return {
    syntax: { ok: true, mode },
    typo: { ok: true },
    disposable: { ok: false },
    dns: {},
    smtp: { enabled: smtpEnabled, status: "unknown" },
    roleEmail: { isRole: false },
    patterns: { detected: false, signals: [] },
  };
}

function getPatternImpact(severity: "high" | "medium" | "low", weights: Weights): number {
  switch (severity) {
    case "high":
      return weights.patternHigh;
    case "medium":
      return weights.patternMedium;
    case "low":
      return weights.patternLow;
  }
}

function getLimiter(limit: number): RateLimiter {
  let limiter = limiterPool.get(limit);
  if (!limiter) {
    limiter = new RateLimiter(limit, 60 * 1000);
    limiterPool.set(limit, limiter);
  }
  return limiter;
}

function toOutputResult(
  detailed: PMEmailDetailedResult,
  output: "basic" | "full"
): PMEmailResult | PMEmailDetailedResult {
  if (output === "full") {
    return detailed;
  }

  const {
    intelligence: _intelligence,
    risks: _risks,
    scoreBreakdown: _scoreBreakdown,
    ...basic
  } = detailed;
  return basic;
}

type ValidationRunOptions = {
  collectTrace: boolean;
  includeDetails: boolean;
};

/**
 * Verify an email address and return comprehensive validation result.
 */
export async function verifyEmail(
  email: string,
  options: VerifyOptions = {}
): Promise<PMEmailResult | PMEmailDetailedResult> {
  const output = options.output ?? "basic";
  const includeDetails = output === "full";
  const run = await runValidation(email, options, {
    collectTrace: false,
    includeDetails,
  });

  if (includeDetails) {
    return run.result;
  }

  return toOutputResult(run.result as PMEmailDetailedResult, "basic");
}

/**
 * Build an invalid result for early returns.
 */
function buildInvalidResult(
  email: string,
  normalizedEmail: string,
  reason: string,
  mode: "basic" | "rfc",
  smtpEnabled: boolean
): PMEmailDetailedResult {
  return {
    email,
    normalizedEmail,
    verdict: "invalid",
    confidence: 0,
    reasons: [reason],
    intelligence: {
      canonical: normalizedEmail,
      provider: null,
      providerName: "Unknown",
      providerType: null,
      isCustomDomain: false,
      isRoleEmail: false,
      hasPlusAddressing: false,
      dotsRemoved: 0,
      domainClassification: "unknown",
    },
    risks: [],
    scoreBreakdown: [{ check: "syntax", passed: false, impact: -100, note: reason }],
    checks: {
      syntax: { ok: false, mode, reason },
      typo: { ok: false },
      disposable: { ok: false },
      dns: {},
      smtp: { enabled: smtpEnabled, status: "unknown" },
      roleEmail: { isRole: false },
      patterns: { detected: false, signals: [] },
    },
  };
}

/**
 * Verify an email address with full debug trace.
 */
export async function debugVerifyEmail(email: string, options: VerifyOptions = {}): Promise<DebugResult> {
  const run = await runValidation(email, options, {
    collectTrace: true,
    includeDetails: true,
  });
  return {
    result: run.result as PMEmailDetailedResult,
    trace: run.trace,
  };
}

async function runValidation(
  email: string,
  options: VerifyOptions,
  runOptions: ValidationRunOptions
): Promise<{ result: PMEmailResult | PMEmailDetailedResult; trace: DebugTraceStep[] }> {
  const trace: DebugTraceStep[] = [];
  const pushTrace = (step: string, detail: string, data?: Record<string, unknown>) => {
    if (runOptions.collectTrace) {
      trace.push({ step, detail, data });
    }
  };
  const maybePushRisk = (risk: RiskItem) => {
    if (runOptions.includeDetails) {
      risks.push(risk);
    }
  };
  const maybePushScoreBreakdown = (item: ScoreBreakdownItem) => {
    if (runOptions.includeDetails) {
      scoreBreakdown.push(item);
    }
  };

  const {
    mode,
    typoSuggestions,
    disposableEnabled,
    patternsEnabled,
    roleEmailEnabled,
    catchAllEnabled,
    dnsOpts,
    smtpOpts,
  } = resolveOptions(options);
  const cache = createDnsCache(options);

  // Step 1: Normalize
  const normalized = normalizeEmail(email);
  pushTrace("normalize", normalized.ok ? "normalized" : "failed", {
    reason: normalized.reason,
    normalizedEmail: normalized.normalizedEmail,
  });

  if (!normalized.ok || !normalized.normalizedEmail || !normalized.domain || !normalized.localPart) {
    const detailed = buildInvalidResult(
      email,
      normalized.normalizedEmail ?? email.trim(),
      normalized.reason ?? "Invalid email",
      mode,
      smtpOpts.enabled
    );
    return {
      result: runOptions.includeDetails ? detailed : toOutputResult(detailed, "basic"),
      trace,
    };
  }

  // Step 2: Syntax validation
  const syntax = validateSyntax(normalized.normalizedEmail, mode);
  pushTrace("syntax", syntax.ok ? "ok" : "failed", { mode, reason: syntax.reason });

  if (!syntax.ok) {
    const detailed = buildInvalidResult(
      email,
      normalized.normalizedEmail,
      syntax.reason ?? "Invalid email syntax",
      mode,
      smtpOpts.enabled
    );
    return {
      result: runOptions.includeDetails ? detailed : toOutputResult(detailed, "basic"),
      trace,
    };
  }

  // Initialize result building
  const reasons: string[] = [];
  const risks: RiskItem[] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [];
  const weights: Weights = { ...DEFAULT_WEIGHTS, ...options.scoring?.weights };
  let score = 100;

  const checks = createInitialChecks(mode, smtpOpts.enabled);

  // Step 3: DNS checks (needed for provider detection)
  const dnsResult = await checkDNS(normalized.domain, dnsOpts, cache);
  pushTrace("dns", "checked", {
    domainExists: dnsResult.domainExists,
    mx: dnsResult.mx,
    spf: dnsResult.spf,
    dmarc: dnsResult.dmarc,
    mxHosts: dnsResult.mxHosts,
  });

  checks.dns = {
    domainExists: dnsResult.domainExists,
    mx: dnsResult.mx,
    spf: dnsResult.spf,
    dmarc: dnsResult.dmarc,
    mxHosts: dnsResult.mxHosts,
  };

  // Step 4: Provider detection
  const providerResult = runOptions.includeDetails ? detectProvider(normalized.domain, dnsResult.mxHosts) : null;
  if (providerResult) {
    pushTrace("provider", providerResult.provider ? "detected" : "unknown", {
      provider: providerResult.provider?.id,
      providerName: providerResult.provider?.name,
      detectionMethod: providerResult.detectionMethod,
      isCustomDomain: providerResult.isCustomDomain,
    });
  }

  // Step 5: Canonical email calculation
  const canonicalResult = getCanonicalEmail(normalized.normalizedEmail, dnsResult.mxHosts);
  pushTrace("canonical", canonicalResult.wasNormalized ? "normalized" : "unchanged", {
    canonical: canonicalResult.canonical,
    dotsRemoved: canonicalResult.normalization.dotsRemoved,
    plusTag: canonicalResult.normalization.plusTag,
  });

  // Step 6: Role email detection
  let roleResult = { isRole: false, prefix: undefined as string | undefined, category: undefined as string | undefined };
  if (roleEmailEnabled) {
    const roleCheck = isRoleEmail(normalized.localPart);
    roleResult = {
      isRole: roleCheck.isRole,
      prefix: roleCheck.prefix,
      category: roleCheck.category,
    };
    checks.roleEmail = roleResult;
    pushTrace("roleEmail", roleResult.isRole ? "detected" : "not_detected", {
      prefix: roleResult.prefix,
      category: roleResult.category,
    });

    if (roleResult.isRole) {
      score -= weights.roleEmail;
      reasons.push(`Role-based email address (${roleResult.category ?? "generic"})`);
      maybePushRisk({
        signal: "role_email",
        description: "Role-based email address",
        severity: "low",
        details: roleResult.prefix,
      });
      maybePushScoreBreakdown({
        check: "role_email",
        passed: false,
        impact: -weights.roleEmail,
        note: `Role: ${roleResult.prefix}`,
      });
    } else {
      maybePushScoreBreakdown({ check: "role_email", passed: true, impact: 0 });
    }
  }

  // Step 7: Pattern detection
  if (patternsEnabled) {
    const patterns = detectPatterns(normalized.localPart);
    const hasPatterns = patterns.length > 0;
    checks.patterns = {
      detected: hasPatterns,
      signals: patterns.map((p) => p.type),
    };
    pushTrace("patterns", hasPatterns ? "detected" : "none", {
      patterns: patterns.map((p) => ({ type: p.type, match: p.match })),
    });

    if (hasPatterns) {
      const highestSeverity = getHighestSeverity(patterns);
      for (const pattern of patterns) {
        const impact = getPatternImpact(pattern.severity, weights);
        score -= impact;
        maybePushRisk({
          signal: pattern.type,
          description: pattern.description,
          severity: pattern.severity,
          details: pattern.match,
        });
        maybePushScoreBreakdown({
          check: `pattern_${pattern.type}`,
          passed: false,
          impact: -impact,
          note: pattern.description,
        });
      }
      if (highestSeverity === "high") {
        reasons.push("Suspicious email pattern detected");
      }
    } else {
      maybePushScoreBreakdown({ check: "patterns", passed: true, impact: 0 });
    }
  }

  // Step 8: Plus addressing check
  if (canonicalResult.normalization.plusTagRemoved) {
    score -= weights.plusAddressing;
    maybePushRisk({
      signal: "plus_addressing",
      description: "Uses plus addressing",
      severity: "low",
      details: `+${canonicalResult.normalization.plusTag}`,
    });
    maybePushScoreBreakdown({
      check: "plus_addressing",
      passed: true,
      impact: -weights.plusAddressing,
      note: "Minor signal - user may be tracking source",
    });
  }

  // Step 9: Typo suggestions
  if (typoSuggestions) {
    const typo = suggestTypo(normalized.normalizedEmail);
    checks.typo = typo;
    pushTrace("typo", typo.suggestedEmail ? "suggested" : "none", {
      suggestedEmail: typo.suggestedEmail,
    });
    if (typo.suggestedEmail) {
      score -= weights.typo;
      reasons.push(`Domain looks misspelled. Did you mean ${typo.suggestedEmail}?`);
      maybePushRisk({
        signal: "typo_domain",
        description: "Domain may be a typo",
        severity: "medium",
        details: typo.suggestedEmail,
      });
      maybePushScoreBreakdown({
        check: "typo",
        passed: false,
        impact: -weights.typo,
        note: `Suggestion: ${typo.suggestedEmail}`,
      });
    } else {
      maybePushScoreBreakdown({ check: "typo", passed: true, impact: 0 });
    }
  }

  // Step 10: Disposable check
  if (disposableEnabled) {
    const disposable = checkDisposable(normalized.domain, options.disposable?.provider);
    checks.disposable = disposable;
    pushTrace("disposable", disposable.ok ? "detected" : "not_detected", { source: disposable.source });
    if (disposable.ok) {
      score -= weights.disposable;
      reasons.push("Disposable email domain detected");
      maybePushRisk({
        signal: "disposable_domain",
        description: "Disposable/temporary email domain",
        severity: "high",
      });
      maybePushScoreBreakdown({
        check: "disposable",
        passed: false,
        impact: -weights.disposable,
        note: "Temporary email provider",
      });
    } else {
      maybePushScoreBreakdown({ check: "disposable", passed: true, impact: 0 });
    }
  }

  // Step 11: DNS score impact
  if (dnsOpts.mx && dnsResult.mx === false) {
    score -= weights.noMx;
    reasons.push("No MX records found; email delivery likely fails");
    maybePushRisk({
      signal: "no_mx_records",
      description: "Domain has no MX records",
      severity: "high",
    });
    maybePushScoreBreakdown({
      check: "dns_mx",
      passed: false,
      impact: -weights.noMx,
      note: "No mail server configured",
    });
  } else if (dnsOpts.mx) {
    maybePushScoreBreakdown({ check: "dns_mx", passed: true, impact: 0 });
  }

  if (dnsOpts.spf && dnsResult.spf === false) {
    score -= weights.noSpf;
    reasons.push("No SPF record found");
    maybePushRisk({
      signal: "no_spf",
      description: "Domain has no SPF record",
      severity: "low",
    });
    maybePushScoreBreakdown({
      check: "dns_spf",
      passed: false,
      impact: -weights.noSpf,
      note: "Missing email authentication",
    });
  } else if (dnsOpts.spf) {
    maybePushScoreBreakdown({ check: "dns_spf", passed: true, impact: 0 });
  }

  if (dnsOpts.dmarc && dnsResult.dmarc === false) {
    score -= weights.noDmarc;
    reasons.push("No DMARC record found");
    maybePushRisk({
      signal: "no_dmarc",
      description: "Domain has no DMARC record",
      severity: "low",
    });
    maybePushScoreBreakdown({
      check: "dns_dmarc",
      passed: false,
      impact: -weights.noDmarc,
      note: "Missing email authentication",
    });
  } else if (dnsOpts.dmarc) {
    maybePushScoreBreakdown({ check: "dns_dmarc", passed: true, impact: 0 });
  }

  // Step 12: SMTP probing (optional)
  if (smtpOpts.enabled) {
    const limit = smtpOpts.maxConnectionsPerDomainPerMinute;
    const limiter = getLimiter(limit);
    const smtpResult = await probeSmtp(
      normalized.domain,
      normalized.normalizedEmail,
      { timeoutMs: smtpOpts.timeoutMs },
      limiter,
      cache
    );
    pushTrace("smtp", smtpResult.status, { code: smtpResult.code });
    checks.smtp = { enabled: true, status: smtpResult.status, code: smtpResult.code };

    if (smtpResult.status === "invalid") {
      score -= weights.smtpInvalid;
      reasons.push("SMTP server rejected recipient");
      maybePushRisk({
        signal: "smtp_invalid",
        description: "SMTP verification failed - address rejected",
        severity: "high",
      });
      maybePushScoreBreakdown({
        check: "smtp",
        passed: false,
        impact: -weights.smtpInvalid,
        note: `Rejected with code ${smtpResult.code}`,
      });
    } else if (smtpResult.status === "unknown") {
      score -= weights.smtpUnknown;
      maybePushScoreBreakdown({
        check: "smtp",
        passed: true,
        impact: -weights.smtpUnknown,
        note: "Verification inconclusive",
      });
    } else {
      maybePushScoreBreakdown({ check: "smtp", passed: true, impact: 0, note: "Address accepted" });
    }
  }

  // Step 13: Catch-all detection (optional)
  if (catchAllEnabled && dnsResult.mxHosts && dnsResult.mxHosts.length > 0) {
    const catchAllResult = await checkCatchAll(
      normalized.domain,
      { timeoutMs: options.catchAll?.timeoutMs ?? 5000 },
      cache
    );
    pushTrace("catchAll", catchAllResult.isCatchAll ? "detected" : "not_detected", {
      isCatchAll: catchAllResult.isCatchAll,
      confidence: catchAllResult.confidence,
      method: catchAllResult.method,
    });
    checks.catchAll = {
      checked: true,
      isCatchAll: catchAllResult.isCatchAll,
      confidence: catchAllResult.confidence,
    };

    if (catchAllResult.isCatchAll) {
      score -= weights.catchAll;
      maybePushRisk({
        signal: "catch_all",
        description: "Domain accepts all addresses (catch-all)",
        severity: "medium",
        details: "SMTP verification less reliable",
      });
      maybePushScoreBreakdown({
        check: "catch_all",
        passed: true,
        impact: -weights.catchAll,
        note: "Domain is catch-all",
      });
    } else {
      maybePushScoreBreakdown({ check: "catch_all", passed: true, impact: 0 });
    }
  }

  // Calculate final score and verdict
  const confidence = clampScore(score);
  const verdict = computeVerdict(confidence, {
    valid: options.scoring?.thresholds?.valid ?? DEFAULT_THRESHOLDS.valid,
    risky: options.scoring?.thresholds?.risky ?? DEFAULT_THRESHOLDS.risky,
    unknown: options.scoring?.thresholds?.unknown ?? DEFAULT_THRESHOLDS.unknown,
  });

  pushTrace("score", verdict, { confidence, reasons });

  const baseResult: PMEmailResult = {
    email,
    normalizedEmail: normalized.normalizedEmail,
    verdict,
    confidence,
    reasons,
    checks,
  };

  if (!runOptions.includeDetails) {
    return {
      result: baseResult,
      trace,
    };
  }

  const provider = providerResult!;
  const intelligence: Intelligence = {
    canonical: canonicalResult.canonical,
    provider: provider.provider?.id ?? null,
    providerName: getProviderName(normalized.domain, dnsResult.mxHosts),
    providerType: provider.provider?.type ?? null,
    isCustomDomain: provider.isCustomDomain,
    isRoleEmail: roleResult.isRole,
    roleCategory: roleResult.category,
    hasPlusAddressing: canonicalResult.normalization.plusTagRemoved,
    plusTag: canonicalResult.normalization.plusTag,
    dotsRemoved: canonicalResult.normalization.dotsRemoved,
    domainClassification: provider.provider
      ? (provider.provider.type as Intelligence["domainClassification"])
      : provider.isCustomDomain
        ? "business"
        : "unknown",
    mxProvider: provider.mxProvider,
  };

  return {
    result: {
      ...baseResult,
      intelligence,
      risks,
      scoreBreakdown,
    },
    trace,
  };
}
