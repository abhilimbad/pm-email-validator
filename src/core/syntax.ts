const BASIC_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSyntax(
  email: string,
  mode: "basic" | "rfc" = "basic"
): { ok: boolean; reason?: string } {
  if (mode === "basic") {
    if (!BASIC_RE.test(email)) {
      return { ok: false, reason: "Email does not match basic syntax" };
    }
    return { ok: true };
  }

  if (email.length > 254) {
    return { ok: false, reason: "Email length exceeds 254 characters" };
  }
  const parts = email.split("@");
  if (parts.length !== 2) {
    return { ok: false, reason: "Email must contain a single @ symbol" };
  }
  const [local, domain] = parts;
  if (!local || !domain) {
    return { ok: false, reason: "Email local or domain part missing" };
  }
  if (local.length > 64) {
    return { ok: false, reason: "Local part exceeds 64 characters" };
  }
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return { ok: false, reason: "Local part has invalid dot placement" };
  }
  const localRe = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
  if (!localRe.test(local)) {
    return { ok: false, reason: "Local part contains invalid characters" };
  }
  const domainRe = /^(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
  if (!domainRe.test(domain)) {
    return { ok: false, reason: "Domain part is invalid" };
  }
  return { ok: true };
}
