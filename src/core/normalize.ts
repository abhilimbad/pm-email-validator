import { domainToASCII } from "node:url";

export function normalizeEmail(email: string): {
  ok: boolean;
  reason?: string;
  localPart?: string;
  domain?: string;
  normalizedEmail?: string;
  dnsDomain?: string;
} {
  const trimmed = email.trim();
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { ok: false, reason: "Email must contain a single @ symbol" };
  }
  const [localPart, domainRaw] = parts;
  if (!localPart) {
    return { ok: false, reason: "Email local part is missing" };
  }
  if (!domainRaw) {
    return { ok: false, reason: "Email domain is missing" };
  }
  const domain = domainRaw.toLowerCase();
  const normalizedEmail = `${localPart}@${domain}`;
  let dnsDomain: string;
  try {
    dnsDomain = domainToASCII(domain);
  } catch (_err) {
    return { ok: false, reason: "Email domain is invalid" };
  }
  if (!dnsDomain) {
    return { ok: false, reason: "Email domain is invalid" };
  }
  return { ok: true, localPart, domain, normalizedEmail, dnsDomain };
}
