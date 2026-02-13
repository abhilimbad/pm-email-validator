import { describe, expect, it, vi } from "vitest";
import dns from "node:dns/promises";
import { checkDNS } from "../src/core/dns.js";
import { DnsCache } from "../src/core/cache.js";

describe("checkDNS", () => {
  it("parses TXT records for SPF and DMARC", async () => {
    vi.spyOn(dns, "resolveMx").mockRejectedValueOnce(new Error("no mx"));
    vi.spyOn(dns, "resolveTxt")
      .mockResolvedValueOnce([["v=spf1 include:_spf.google.com ~all"]])
      .mockResolvedValueOnce([["v=DMARC1; p=reject; rua=mailto:reports@example.com"]]);
    vi.spyOn(dns, "resolve4").mockResolvedValueOnce(["1.2.3.4"]);
    vi.spyOn(dns, "resolve6").mockRejectedValueOnce(new Error("no aaaa"));

    const result = await checkDNS("example.com", { mx: true, spf: true, dmarc: true, timeoutMs: 1000 }, new DnsCache());
    expect(result.spf).toBe(true);
    expect(result.dmarc).toBe(true);
    expect(result.domainExists).toBe(true);
  });
});
