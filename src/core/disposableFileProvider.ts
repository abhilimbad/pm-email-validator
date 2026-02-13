import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DisposableProvider } from "../types.js";

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function parseDomainList(content: string): Set<string> {
  const domains = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    domains.add(normalizeDomain(value));
  }

  return domains;
}

export function createDisposableProviderFromDomains(
  domains: Iterable<string>,
  name = "custom-file"
): DisposableProvider {
  const set = new Set<string>();
  for (const domain of domains) {
    const value = normalizeDomain(domain);
    if (value) {
      set.add(value);
    }
  }

  return {
    name,
    has(domain: string): boolean {
      return set.has(normalizeDomain(domain));
    },
  };
}

export function loadDisposableProviderFromFile(
  filePath = "data/disposable_domains.txt",
  name = "temp-mail-file"
): DisposableProvider {
  const raw = readFileSync(resolve(process.cwd(), filePath), "utf8");
  const domains = parseDomainList(raw);
  return createDisposableProviderFromDomains(domains, name);
}
