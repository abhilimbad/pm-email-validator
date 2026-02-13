import { PRIMARY_DOMAINS, COMMON_EMAIL_DOMAINS_SET, DOMAIN_ALIASES } from "../data/typo.js";

/**
 * Calculate Levenshtein distance between two strings.
 * Optimized single-row DP implementation.
 */
function levenshtein(a: string, b: string): number {
  const dp: number[] = new Array(b.length + 1).fill(0);
  for (let j = 0; j <= b.length; j += 1) dp[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[b.length];
}

/**
 * Check if a domain is a known valid email domain.
 */
export function isKnownDomain(domain: string): boolean {
  return COMMON_EMAIL_DOMAINS_SET.has(domain.toLowerCase());
}

/**
 * Get the canonical domain if this is an alias.
 * e.g., "googlemail.com" -> "gmail.com"
 */
export function getCanonicalDomain(domain: string): string {
  const lower = domain.toLowerCase();
  return DOMAIN_ALIASES[lower] ?? lower;
}

/**
 * Find the best typo suggestion for a domain.
 *
 * @param domain - The domain to check
 * @param maxDistance - Maximum Levenshtein distance to consider (default: 2)
 * @returns Best matching domain or undefined
 */
export function findBestMatch(domain: string, maxDistance = 2): string | undefined {
  const lower = domain.toLowerCase();

  // If it's already a known domain, no typo
  if (COMMON_EMAIL_DOMAINS_SET.has(lower)) {
    return undefined;
  }

  let best: { domain: string; distance: number } | undefined;

  // Check against primary domains first (most likely matches)
  for (const candidate of PRIMARY_DOMAINS) {
    const distance = levenshtein(lower, candidate);
    if (distance <= maxDistance && distance > 0) {
      if (!best || distance < best.distance) {
        best = { domain: candidate, distance };
      }
    }
  }

  return best?.domain;
}

/**
 * Suggest a typo correction for an email address.
 *
 * @param email - The full email address
 * @returns Result with ok=true and optional suggestedEmail
 */
export function suggestTypo(email: string): { ok: boolean; suggestedEmail?: string } {
  const parts = email.split("@");
  if (parts.length !== 2) return { ok: false };
  const [local, domain] = parts;
  if (!domain) return { ok: false };

  const suggestion = findBestMatch(domain);

  if (!suggestion) {
    return { ok: true };
  }

  return { ok: true, suggestedEmail: `${local}@${suggestion}` };
}

/**
 * Get the suggested domain only (without local part).
 *
 * @param domain - The domain to check
 * @returns Suggested domain or undefined
 */
export function suggestDomain(domain: string): string | undefined {
  return findBestMatch(domain);
}
