import { describe, expect, it } from "vitest";
import { checkDisposable } from "../src/core/disposable.js";

describe("checkDisposable", () => {
  it("detects disposable domain", () => {
    const result = checkDisposable("mailinator.com");
    expect(result.ok).toBe(true);
  });
});
