import { describe, expect, it, vi } from "vitest";
import { DnsCache } from "../src/core/cache.js";

describe("DnsCache", () => {
  it("stores and retrieves values", () => {
    const cache = new DnsCache({ ttlMs: 1000, maxEntries: 10 });
    cache.set("MX:example.com", { ok: true });
    const hit = cache.get<{ ok: boolean }>("MX:example.com");
    expect(hit?.data.ok).toBe(true);
  });

  it("expires values after ttl", () => {
    vi.useFakeTimers();
    const cache = new DnsCache({ ttlMs: 1000, maxEntries: 10 });
    cache.set("MX:example.com", { ok: true });
    vi.advanceTimersByTime(1001);
    const hit = cache.get("MX:example.com");
    expect(hit).toBe(undefined);
    vi.useRealTimers();
  });

  it("evicts oldest when maxEntries exceeded", () => {
    const cache = new DnsCache({ ttlMs: 1000, maxEntries: 2 });
    cache.set("k1", 1);
    cache.set("k2", 2);
    cache.set("k3", 3);
    expect(cache.get("k1")).toBe(undefined);
    expect(cache.get("k2")?.data).toBe(2);
    expect(cache.get("k3")?.data).toBe(3);
  });
});
