import { describe, expect, it, vi } from "vitest";
import { RateLimiter } from "../src/core/limiter.js";

describe("RateLimiter", () => {
  it("allows within limit and blocks after", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow("example.com")).toBe(true);
    expect(limiter.allow("example.com")).toBe(true);
    expect(limiter.allow("example.com")).toBe(false);
  });

  it("resets after window", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.allow("example.com")).toBe(true);
    expect(limiter.allow("example.com")).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(limiter.allow("example.com")).toBe(true);
    vi.useRealTimers();
  });
});
