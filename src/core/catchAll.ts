/**
 * Catch-all domain detection module.
 * Detects domains that accept emails for any address (catch-all/wildcard).
 */

import net from "node:net";
import { DnsCache } from "./cache.js";
import { checkDNS } from "./dns.js";
import crypto from "node:crypto";

export interface CatchAllResult {
  /** Whether the domain is a catch-all */
  isCatchAll: boolean;
  /** Confidence in the result */
  confidence: "high" | "low";
  /** Detection method used */
  method: "smtp_probe" | "heuristic" | "unknown";
  /** Additional details */
  details?: string;
}

/**
 * Generate a random email address that definitely doesn't exist.
 */
function generateRandomEmail(domain: string): string {
  const randomPart = crypto.randomBytes(16).toString("hex");
  return `catch-all-test-${randomPart}@${domain}`;
}

/**
 * Parse SMTP response code from a line.
 */
function parseCode(line: string): string | undefined {
  const match = line.match(/^(\d{3})/);
  return match?.[1];
}

/**
 * Connect to SMTP and probe for catch-all behavior.
 * Tests if a random, non-existent address is accepted.
 */
async function smtpCatchAllProbe(
  host: string,
  testEmail: string,
  timeoutMs: number
): Promise<{ accepts: boolean; code?: string; error?: string }> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    let stage: "greet" | "helo" | "mailfrom" | "rcpt" | "done" = "greet";
    let resolved = false;

    const done = (result: { accepts: boolean; code?: string; error?: string }) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      done({ accepts: false, error: "timeout" });
    }, timeoutMs);

    const send = (cmd: string) => {
      socket.write(`${cmd}\r\n`);
    };

    socket.on("data", (data) => {
      const text = data.toString("utf8");
      const lastLine = text.trim().split(/\r?\n/).pop() ?? "";
      const code = parseCode(lastLine);
      if (!code) return;

      if (stage === "greet") {
        send(`HELO localhost`);
        stage = "helo";
        return;
      }

      if (stage === "helo") {
        if (lastLine.startsWith("250")) {
          send(`MAIL FROM:<probe@localhost>`);
          stage = "mailfrom";
          return;
        }
      }

      if (stage === "mailfrom") {
        if (lastLine.startsWith("250")) {
          send(`RCPT TO:<${testEmail}>`);
          stage = "rcpt";
          return;
        }
      }

      if (stage === "rcpt") {
        clearTimeout(timer);
        send("QUIT");
        stage = "done";

        // 250 = accepted (catch-all)
        if (lastLine.startsWith("250")) {
          done({ accepts: true, code });
          return;
        }

        // 550, 551, 553 = rejected (not catch-all)
        if (lastLine.startsWith("550") || lastLine.startsWith("551") || lastLine.startsWith("553")) {
          done({ accepts: false, code });
          return;
        }

        // 4xx = temporary error, can't determine
        if (lastLine.startsWith("4")) {
          done({ accepts: false, code, error: "temporary_error" });
          return;
        }

        // Other codes
        done({ accepts: false, code, error: "unexpected_response" });
        return;
      }

      // Early rejection
      if (code.startsWith("5")) {
        clearTimeout(timer);
        stage = "done";
        done({ accepts: false, code, error: "rejected_early" });
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      done({ accepts: false, error: err.message });
    });

    socket.on("end", () => {
      clearTimeout(timer);
      done({ accepts: false, error: "connection_closed" });
    });
  });
}

/**
 * Check if a domain is a catch-all (accepts all addresses).
 *
 * This works by attempting to verify a random, non-existent address.
 * If the domain accepts it, it's likely a catch-all.
 *
 * @param domain - The domain to check
 * @param opts - Options including timeout and cache
 * @returns Catch-all detection result
 */
export async function checkCatchAll(
  domain: string,
  opts: { timeoutMs?: number } = {},
  cache?: DnsCache
): Promise<CatchAllResult> {
  const timeoutMs = opts.timeoutMs ?? 5000;

  // Get MX records
  const dnsResult = await checkDNS(
    domain,
    { mx: true, spf: false, dmarc: false, timeoutMs },
    cache
  );

  const mxHosts = dnsResult.mxHosts ?? [];

  if (mxHosts.length === 0) {
    return {
      isCatchAll: false,
      confidence: "low",
      method: "unknown",
      details: "No MX records found",
    };
  }

  // Generate a random email that shouldn't exist
  const testEmail = generateRandomEmail(domain);

  // Try each MX host
  for (const host of mxHosts) {
    try {
      const result = await smtpCatchAllProbe(host, testEmail, timeoutMs);

      if (result.error) {
        continue; // Try next MX host
      }

      if (result.accepts) {
        return {
          isCatchAll: true,
          confidence: "high",
          method: "smtp_probe",
          details: `Random address accepted by ${host}`,
        };
      } else {
        return {
          isCatchAll: false,
          confidence: "high",
          method: "smtp_probe",
          details: `Random address rejected with code ${result.code}`,
        };
      }
    } catch {
      // Continue to next host
    }
  }

  // Couldn't determine
  return {
    isCatchAll: false,
    confidence: "low",
    method: "unknown",
    details: "Could not connect to any MX host",
  };
}

/**
 * Quick check if a domain might be catch-all based on heuristics.
 * This is faster but less accurate than SMTP probing.
 *
 * Known catch-all indicators:
 * - Very small/personal domains often are catch-all
 * - Some providers (like custom domains on certain hosts) default to catch-all
 */
export function mightBeCatchAll(domain: string, mxHosts?: string[]): boolean {
  // Heuristic: Single-word domains with personal TLDs
  // These are often personal domains with catch-all enabled
  const personalTlds = [".me", ".io", ".dev", ".page", ".app", ".xyz"];
  const hasPersonalTld = personalTlds.some((tld) => domain.endsWith(tld));

  if (hasPersonalTld && !domain.includes(".")) {
    return true;
  }

  // If we have MX hosts, check for known catch-all-friendly providers
  // (This is very heuristic and not reliable)
  // Most proper detection should use SMTP probing

  return false;
}
