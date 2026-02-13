/**
 * Canonical email calculation module.
 * Applies provider-specific normalization to get the "real" email address.
 */

import { detectProvider } from "./provider.js";
import { getProviderByDomain } from "../data/providers.js";

export interface CanonicalResult {
  /** The original email */
  original: string;
  /** The canonical (normalized) email */
  canonical: string;
  /** Local part after normalization */
  localPart: string;
  /** Domain (always lowercase) */
  domain: string;
  /** Whether any normalization was applied */
  wasNormalized: boolean;
  /** Details about what was normalized */
  normalization: {
    /** Dots were removed from local part (Gmail) */
    dotsRemoved: number;
    /** Plus addressing tag was removed */
    plusTagRemoved: boolean;
    /** The plus tag that was removed */
    plusTag?: string;
    /** Dash addressing tag was removed (Yahoo) */
    dashTagRemoved?: boolean;
    /** The dash tag that was removed */
    dashTag?: string;
  };
}

/**
 * Extract plus tag from local part.
 * e.g., "user+newsletter" -> { base: "user", tag: "newsletter" }
 */
function extractPlusTag(localPart: string): { base: string; tag?: string } {
  const plusIndex = localPart.indexOf("+");
  if (plusIndex === -1) {
    return { base: localPart };
  }
  return {
    base: localPart.slice(0, plusIndex),
    tag: localPart.slice(plusIndex + 1),
  };
}

/**
 * Extract dash tag from local part (Yahoo-style).
 * Yahoo uses the LAST dash for disposable addresses.
 * e.g., "user-temp" -> { base: "user", tag: "temp" }
 * Note: Only applies if we detect Yahoo provider
 */
function extractDashTag(localPart: string): { base: string; tag?: string } {
  const dashIndex = localPart.lastIndexOf("-");
  if (dashIndex === -1 || dashIndex === 0) {
    return { base: localPart };
  }
  return {
    base: localPart.slice(0, dashIndex),
    tag: localPart.slice(dashIndex + 1),
  };
}

/**
 * Remove dots from local part (Gmail style).
 * Gmail ignores dots entirely: j.o.h.n = john
 */
function removeDots(localPart: string): { result: string; count: number } {
  const count = (localPart.match(/\./g) || []).length;
  return {
    result: localPart.replace(/\./g, ""),
    count,
  };
}

/**
 * Get the canonical form of an email address.
 *
 * This applies provider-specific normalization rules:
 * - Gmail: Removes dots, strips +tag
 * - Outlook/Microsoft: Strips +tag (dots are significant)
 * - Yahoo: Strips -tag (Yahoo's disposable address format)
 * - Proton: Strips +tag
 *
 * @param email - The email address to canonicalize
 * @param mxHosts - Optional MX hosts for custom domain detection
 * @returns Canonical result with normalization details
 */
export function getCanonicalEmail(
  email: string,
  mxHosts?: string[]
): CanonicalResult {
  // Basic parsing
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    return {
      original: email,
      canonical: email.toLowerCase(),
      localPart: email.toLowerCase(),
      domain: "",
      wasNormalized: false,
      normalization: {
        dotsRemoved: 0,
        plusTagRemoved: false,
      },
    };
  }

  const originalLocalPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1).toLowerCase();

  // Detect provider
  const providerResult = detectProvider(domain, mxHosts);
  const provider = providerResult.provider;

  // Start with original local part (preserve case for now)
  let normalizedLocal = originalLocalPart;
  let dotsRemoved = 0;
  let plusTag: string | undefined;
  let plusTagRemoved = false;
  let dashTag: string | undefined;
  let dashTagRemoved = false;

  // Apply provider-specific normalization
  if (provider) {
    // Gmail: dots don't matter
    if (provider.features.dotInsensitive) {
      const dotResult = removeDots(normalizedLocal);
      normalizedLocal = dotResult.result;
      dotsRemoved = dotResult.count;
    }

    // Plus addressing
    if (provider.features.plusAddressing) {
      const plusResult = extractPlusTag(normalizedLocal);
      if (plusResult.tag) {
        normalizedLocal = plusResult.base;
        plusTag = plusResult.tag;
        plusTagRemoved = true;
      }
    }

    // Yahoo-style dash addressing
    if (provider.features.dashAddressing) {
      const dashResult = extractDashTag(normalizedLocal);
      if (dashResult.tag) {
        normalizedLocal = dashResult.base;
        dashTag = dashResult.tag;
        dashTagRemoved = true;
      }
    }
  } else {
    // Unknown provider: still try to strip plus addressing (common convention)
    const plusResult = extractPlusTag(normalizedLocal);
    if (plusResult.tag) {
      normalizedLocal = plusResult.base;
      plusTag = plusResult.tag;
      plusTagRemoved = true;
    }
  }

  // Always lowercase the final canonical form
  normalizedLocal = normalizedLocal.toLowerCase();

  const canonical = `${normalizedLocal}@${domain}`;
  const wasNormalized =
    dotsRemoved > 0 || plusTagRemoved || dashTagRemoved || canonical !== email.toLowerCase();

  return {
    original: email,
    canonical,
    localPart: normalizedLocal,
    domain,
    wasNormalized,
    normalization: {
      dotsRemoved,
      plusTagRemoved,
      plusTag,
      dashTagRemoved: dashTagRemoved || undefined,
      dashTag,
    },
  };
}

/**
 * Check if two emails resolve to the same canonical address.
 *
 * @param email1 - First email
 * @param email2 - Second email
 * @returns true if they're the same after canonicalization
 */
export function isSameCanonicalEmail(email1: string, email2: string): boolean {
  return getCanonicalEmail(email1).canonical === getCanonicalEmail(email2).canonical;
}

/**
 * Extract plus tag from an email (convenience function).
 *
 * @param email - The email address
 * @returns The plus tag or undefined
 */
export function getPlusTag(email: string): string | undefined {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return undefined;

  const localPart = email.slice(0, atIndex);
  const { tag } = extractPlusTag(localPart);
  return tag;
}

/**
 * Check if email has plus addressing.
 *
 * @param email - The email address
 * @returns true if has plus tag
 */
export function hasPlusAddressing(email: string): boolean {
  return getPlusTag(email) !== undefined;
}
