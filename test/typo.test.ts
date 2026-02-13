import { describe, expect, it } from "vitest";
import { suggestTypo } from "../src/core/typo.js";

describe("suggestTypo", () => {
  it("suggests gmail.com for gmial.com", () => {
    const result = suggestTypo("user@gmial.com");
    expect(result.suggestedEmail).toBe("user@gmail.com");
  });
});
