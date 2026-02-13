import { describe, expect, it } from "vitest";
import { computeVerdict } from "../src/core/scoring.js";

describe("computeVerdict", () => {
  it("maps score to buckets", () => {
    expect(computeVerdict(90)).toBe("valid");
    expect(computeVerdict(70)).toBe("risky");
    expect(computeVerdict(40)).toBe("unknown");
    expect(computeVerdict(10)).toBe("invalid");
  });
});
