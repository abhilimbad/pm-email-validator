import { DisposableProvider } from "../types.js";
import { isDisposableDomain, DISPOSABLE_DOMAINS } from "../data/disposable.js";

/**
 * Built-in disposable email provider using the inlined domain list.
 * Zero dependencies - no file system access needed.
 */
const builtinProvider: DisposableProvider = {
  name: "builtin",
  has(domain: string): boolean {
    return isDisposableDomain(domain);
  }
};

/**
 * Check if a domain is a disposable/temporary email provider.
 *
 * @param domain - The domain to check
 * @param provider - Optional custom provider (defaults to builtin)
 * @returns Result with ok=true if disposable
 */
export function checkDisposable(
  domain: string,
  provider?: DisposableProvider
): { ok: boolean; source?: string } {
  const used = provider ?? builtinProvider;
  const ok = used.has(domain);
  return ok ? { ok: true, source: used.name } : { ok: false };
}

/**
 * Get the built-in disposable provider.
 */
export function getBuiltinDisposableProvider(): DisposableProvider {
  return builtinProvider;
}

/**
 * Check if a domain is disposable using the builtin list directly.
 * Convenience function that doesn't require provider abstraction.
 */
export function isDisposable(domain: string): boolean {
  return isDisposableDomain(domain);
}

/**
 * Get the count of domains in the builtin list.
 */
export function getDisposableDomainCount(): number {
  return DISPOSABLE_DOMAINS.size;
}
