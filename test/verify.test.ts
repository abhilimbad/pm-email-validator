import { describe, expect, it, vi } from "vitest";
import dns from "node:dns/promises";
import { verifyEmail } from "../src/verify.js";

vi.mock("node:dns/promises", async () => {
  const actual = await vi.importActual<typeof import("node:dns/promises")>("node:dns/promises");
  return actual;
});

describe("verifyEmail", () => {
  it("returns early on invalid syntax", async () => {
    const spy = vi.spyOn(dns, "resolveMx");
    const result = await verifyEmail("invalid-email");
    expect(result.verdict).toBe("invalid");
    expect(result.confidence).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("produces reasons with deductions", async () => {
    vi.spyOn(dns, "resolveMx").mockRejectedValueOnce(new Error("no mx"));
    vi.spyOn(dns, "resolveTxt")
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.spyOn(dns, "resolve4").mockResolvedValueOnce(["1.2.3.4"]);
    vi.spyOn(dns, "resolve6").mockResolvedValueOnce(["::1"]);

    const result = await verifyEmail("user@gmial.com");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.checks.typo.suggestedEmail).toBe("user@gmail.com");
  });
});
