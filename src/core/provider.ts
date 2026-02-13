/**
 * Provider detection and intelligence module.
 * Detects email providers from domain or MX records.
 */

import {
  ProviderDefinition,
  ProviderType,
  getProviderByDomain,
  getProviderByMx,
} from "../data/providers.js";

export interface ProviderInfo {
  /** Provider identifier (e.g., "google", "microsoft") */
  id: string;
  /** Display name (e.g., "Gmail", "Outlook") */
  name: string;
  /** Provider type: free, business, privacy, education, government */
  type: ProviderType;
  /** Whether this is a free email provider */
  isFreeProvider: boolean;
  /** Whether this is a business/corporate email */
  isBusinessProvider: boolean;
  /** Whether this is a privacy-focused provider */
  isPrivacyProvider: boolean;
  /** Provider features */
  features: {
    dotInsensitive: boolean;
    plusAddressing: boolean;
    dashAddressing?: boolean;
    aliasSupport: boolean;
  };
}

export interface ProviderDetectionResult {
  /** Detected provider info (null if unknown) */
  provider: ProviderInfo | null;
  /** How the provider was detected */
  detectionMethod: "domain" | "mx" | "none";
  /** Whether the domain appears to be a custom/corporate domain */
  isCustomDomain: boolean;
  /** MX provider if different from domain provider */
  mxProvider?: string;
}

/**
 * Known free email provider domains (quick check without full provider lookup)
 */
const FREE_EMAIL_DOMAINS = new Set([
  // Google
  "gmail.com", "googlemail.com",
  // Microsoft
  "outlook.com", "hotmail.com", "live.com", "msn.com", "hotmail.co.uk", "hotmail.fr",
  // Yahoo
  "yahoo.com", "ymail.com", "rocketmail.com", "yahoo.co.uk", "yahoo.co.in",
  // Apple
  "icloud.com", "me.com", "mac.com",
  // Others
  "aol.com", "aim.com", "mail.com", "gmx.com", "gmx.net", "zoho.com",
  "proton.me", "protonmail.com", "pm.me", "tutanota.com", "fastmail.com",
  "yandex.com", "yandex.ru", "mail.ru", "qq.com", "163.com", "126.com",
]);

/**
 * Convert provider definition to provider info
 */
function toProviderInfo(def: ProviderDefinition): ProviderInfo {
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    isFreeProvider: def.type === "free",
    isBusinessProvider: def.type === "business",
    isPrivacyProvider: def.type === "privacy",
    features: { ...def.features },
  };
}

/**
 * Detect email provider from domain and optional MX hosts.
 *
 * @param domain - The email domain (e.g., "gmail.com")
 * @param mxHosts - Optional MX hosts from DNS lookup
 * @returns Provider detection result
 */
export function detectProvider(
  domain: string,
  mxHosts?: string[]
): ProviderDetectionResult {
  const normalizedDomain = domain.toLowerCase();

  // First, try direct domain lookup
  const domainProvider = getProviderByDomain(normalizedDomain);

  if (domainProvider) {
    return {
      provider: toProviderInfo(domainProvider),
      detectionMethod: "domain",
      isCustomDomain: false,
    };
  }

  // Domain not recognized - try MX-based detection
  if (mxHosts && mxHosts.length > 0) {
    const mxProvider = getProviderByMx(mxHosts);

    if (mxProvider) {
      // Custom domain using a known provider's infrastructure
      return {
        provider: toProviderInfo(mxProvider),
        detectionMethod: "mx",
        isCustomDomain: true,
        mxProvider: mxProvider.name,
      };
    }
  }

  // Unknown provider
  return {
    provider: null,
    detectionMethod: "none",
    isCustomDomain: true, // Assume custom domain if not recognized
  };
}

/**
 * Quick check if domain is a known free email provider.
 * Faster than full provider detection when you only need this info.
 *
 * @param domain - The email domain
 * @returns true if known free provider
 */
export function isFreeEmailProvider(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Quick check if domain appears to be a business/corporate email.
 * This is a heuristic - if it's not a known free provider, assume business.
 *
 * @param domain - The email domain
 * @param mxHosts - Optional MX hosts for better detection
 * @returns true if likely business domain
 */
export function isBusinessEmail(domain: string, mxHosts?: string[]): boolean {
  const result = detectProvider(domain, mxHosts);

  // If it's a known free provider domain, not business
  if (result.detectionMethod === "domain" && result.provider?.isFreeProvider) {
    return false;
  }

  // Custom domain (even on Google Workspace/M365) is considered business
  if (result.isCustomDomain) {
    return true;
  }

  // Check provider type
  return result.provider?.isBusinessProvider ?? false;
}

/**
 * Get the provider name for display purposes.
 *
 * @param domain - The email domain
 * @param mxHosts - Optional MX hosts
 * @returns Provider name or "Unknown"
 */
export function getProviderName(domain: string, mxHosts?: string[]): string {
  const result = detectProvider(domain, mxHosts);

  if (!result.provider) {
    return "Unknown";
  }

  // For custom domains, indicate the underlying provider
  if (result.isCustomDomain) {
    return `${result.provider.name} (Custom Domain)`;
  }

  return result.provider.name;
}
