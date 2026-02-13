import net from "node:net";
import { DnsCache } from "./cache.js";
import { RateLimiter } from "./limiter.js";
import { checkDNS } from "./dns.js";

export interface SmtpProbeResult {
  status: "valid" | "invalid" | "unknown";
  code?: string;
}

function parseCode(line: string): string | undefined {
  const match = line.match(/^(\d{3})/);
  return match?.[1];
}

async function connectAndProbe(host: string, email: string, timeoutMs: number): Promise<SmtpProbeResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    const lines: string[] = [];
    let stage: "greet" | "helo" | "mailfrom" | "rcpt" | "done" = "greet";
    let resolved = false;

    const done = (result: SmtpProbeResult) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      done({ status: "unknown" });
    }, timeoutMs);

    const send = (cmd: string) => {
      socket.write(`${cmd}\r\n`);
    };

    socket.on("data", (data) => {
      const text = data.toString("utf8");
      lines.push(text);
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
          send(`RCPT TO:<${email}>`);
          stage = "rcpt";
          return;
        }
      }

      if (stage === "rcpt") {
        if (lastLine.startsWith("250")) {
          clearTimeout(timer);
          send("QUIT");
          stage = "done";
          done({ status: "valid", code });
          return;
        }
        if (lastLine.startsWith("550") || lastLine.startsWith("551") || lastLine.startsWith("553")) {
          clearTimeout(timer);
          send("QUIT");
          stage = "done";
          done({ status: "invalid", code });
          return;
        }
        if (lastLine.startsWith("4")) {
          clearTimeout(timer);
          send("QUIT");
          stage = "done";
          done({ status: "unknown", code });
          return;
        }
      }

      if (code.startsWith("5")) {
        clearTimeout(timer);
        stage = "done";
        done({ status: "unknown", code });
      }
    });

    socket.on("error", () => {
      clearTimeout(timer);
      done({ status: "unknown" });
    });

    socket.on("end", () => {
      clearTimeout(timer);
      done({ status: "unknown" });
    });
  });
}

export async function probeSmtp(
  domain: string,
  email: string,
  opts: { timeoutMs: number },
  limiter: RateLimiter,
  cache?: DnsCache
): Promise<SmtpProbeResult> {
  if (!limiter.allow(domain)) {
    return { status: "unknown", code: "rate_limited" };
  }

  const dnsResult = await checkDNS(domain, { mx: true, spf: false, dmarc: false, timeoutMs: opts.timeoutMs }, cache);
  const mxHosts = dnsResult.mxHosts ?? [];
  if (mxHosts.length === 0) return { status: "unknown" };

  for (const host of mxHosts) {
    const result = await connectAndProbe(host, email, opts.timeoutMs);
    if (result.status !== "unknown") return result;
  }
  return { status: "unknown" };
}
