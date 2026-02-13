import { describe, expect, it } from "vitest";
import { validateSyntax } from "../src/core/syntax.js";

describe("validateSyntax", () => {
  it("rejects missing @", () => {
    expect(validateSyntax("invalid", "basic").ok).toBe(false);
  });

  it("rejects empty domain", () => {
    expect(validateSyntax("user@", "basic").ok).toBe(false);
  });

  it("rejects spaces", () => {
    expect(validateSyntax("user @example.com", "basic").ok).toBe(false);
  });

  it("accepts basic valid email", () => {
    expect(validateSyntax("user@example.com", "basic").ok).toBe(true);
  });
});
