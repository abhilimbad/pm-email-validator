import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import net from "node:net";
import { probeSmtp } from "../src/core/smtp.js";
import { RateLimiter } from "../src/core/limiter.js";

vi.mock("../src/core/dns.js", () => {
  return {
    checkDNS: vi.fn(async () => ({
      domain: "example.com",
      domainExists: true,
      mx: true,
      mxHosts: ["mx.example.com"]
    }))
  };
});

function mockSocket() {
  const socket = new EventEmitter() as EventEmitter & {
    write: (data: string) => void;
    destroy: () => void;
  };

  socket.write = (data: string) => {
    const cmd = data.trim();
    if (cmd.startsWith("HELO")) {
      setImmediate(() => {
        socket.emit("data", Buffer.from("250 ok\r\n"));
      });
      return;
    }
    if (cmd.startsWith("MAIL FROM")) {
      setImmediate(() => {
        socket.emit("data", Buffer.from("250 ok\r\n"));
      });
      return;
    }
    if (cmd.startsWith("RCPT TO")) {
      setImmediate(() => {
        socket.emit("data", Buffer.from("550 user unknown\r\n"));
      });
      return;
    }
    if (cmd.startsWith("QUIT")) {
      setImmediate(() => {
        socket.emit("end");
      });
    }
  };

  socket.destroy = () => {
    socket.emit("end");
  };

  return socket;
}

describe("probeSmtp", () => {
  it("returns invalid on definitive 550", async () => {
    vi.spyOn(net, "createConnection").mockImplementation(() => {
      const socket = mockSocket();
      setImmediate(() => {
        socket.emit("data", Buffer.from("220 mx.example.com ESMTP\r\n"));
      });
      return socket as unknown as net.Socket;
    });

    const limiter = new RateLimiter(10, 60_000);
    const result = await probeSmtp("example.com", "user@example.com", { timeoutMs: 1000 }, limiter);
    expect(result.status).toBe("invalid");
    expect(result.code).toBe("550");
  });
});
