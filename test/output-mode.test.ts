import { describe, expect, it, vi } from "vitest";
import dns from "node:dns/promises";
import { verifyEmail } from "../src/verify.js";

vi.mock("node:dns/promises", async () => {
  const actual = await vi.importActual<typeof import("node:dns/promises")>("node:dns/promises");
  return actual;
});

describe("verifyEmail output modes", () => {
  it("returns lean result by default", async () => {
    vi.spyOn(dns, "resolveMx").mockResolvedValueOnce([{ exchange: "mx.example.com", priority: 10 }]);
    vi.spyOn(dns, "resolveTxt").mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    vi.spyOn(dns, "resolve4").mockResolvedValueOnce(["1.2.3.4"]);
    vi.spyOn(dns, "resolve6").mockResolvedValueOnce(["::1"]);

    const result = await verifyEmail("user@example.com");
    expect("intelligence" in result).toBe(false);
    expect("risks" in result).toBe(false);
    expect("scoreBreakdown" in result).toBe(false);
    expect(result.checks.syntax.ok).toBe(true);
  });

  it("returns full detailed result when output=full", async () => {
    vi.spyOn(dns, "resolveMx").mockResolvedValueOnce([{ exchange: "mx.example.com", priority: 10 }]);
    vi.spyOn(dns, "resolveTxt").mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    vi.spyOn(dns, "resolve4").mockResolvedValueOnce(["1.2.3.4"]);
    vi.spyOn(dns, "resolve6").mockResolvedValueOnce(["::1"]);

    const result = await verifyEmail("user@example.com", { output: "full" });
    expect("intelligence" in result).toBe(true);
    expect("risks" in result).toBe(true);
    expect("scoreBreakdown" in result).toBe(true);
  });
});
