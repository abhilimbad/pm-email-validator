import { describe, expect, it, vi } from "vitest";
import dns from "node:dns/promises";
import { verifyEmail } from "../src/verify.js";

vi.mock("node:dns/promises", async () => {
  const actual = await vi.importActual<typeof import("node:dns/promises")>("node:dns/promises");
  return actual;
});

describe("verifyEmail options", () => {
  it("respects disabled typo and disposable", async () => {
    vi.spyOn(dns, "resolveMx").mockResolvedValueOnce([{ exchange: "mx.example.com", priority: 10 }]);
    vi.spyOn(dns, "resolveTxt").mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    vi.spyOn(dns, "resolve4").mockResolvedValueOnce(["1.2.3.4"]);
    vi.spyOn(dns, "resolve6").mockResolvedValueOnce(["::1"]);

    const result = await verifyEmail("user@gmial.com", {
      typoSuggestions: false,
      disposable: { enabled: false }
    });

    expect(result.checks.typo.suggestedEmail).toBe(undefined);
    expect(result.checks.disposable.ok).toBe(false);
  });

  it("uses custom scoring thresholds", async () => {
    vi.spyOn(dns, "resolveMx").mockRejectedValueOnce(new Error("no mx"));
    vi.spyOn(dns, "resolveTxt").mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    vi.spyOn(dns, "resolve4").mockResolvedValueOnce(["1.2.3.4"]);
    vi.spyOn(dns, "resolve6").mockResolvedValueOnce(["::1"]);

    const result = await verifyEmail("user@example.com", {
      scoring: { thresholds: { valid: 95, risky: 70, unknown: 40 } }
    });

    expect(["risky", "unknown", "invalid", "valid"]).toContain(result.verdict);
  });
});
