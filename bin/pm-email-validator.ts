import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyEmail } from "../src/verify.js";
import { mapWithConcurrency } from "../src/core/utils.js";

function parseArgs(argv: string[]) {
  const args = [...argv];
  const result: { file?: string; out?: string; concurrency?: number; email?: string } = {};
  while (args.length) {
    const current = args.shift();
    if (!current) break;
    if (current === "--file") result.file = args.shift();
    else if (current === "--out") result.out = args.shift();
    else if (current === "--concurrency") result.concurrency = Number(args.shift());
    else if (!current.startsWith("--") && !result.email) result.email = current;
  }
  return result;
}

async function run() {
  const { file, out, concurrency, email } = parseArgs(process.argv.slice(2));

  if (file) {
    const filePath = resolve(process.cwd(), file);
    const raw = readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const emails = lines.map((line) => line.split(",")[0].trim()).filter(Boolean);
    const limit = Math.max(1, concurrency ?? 10);
    const results = await mapWithConcurrency(emails, limit, (addr) => verifyEmail(addr));
    const output = JSON.stringify(results, null, 2);
    if (out) {
      writeFileSync(resolve(process.cwd(), out), output);
    } else {
      process.stdout.write(output + "\n");
    }
    return;
  }

  if (!email) {
    process.stderr.write("Usage: pm-email-validator <email> | --file emails.csv --out report.json --concurrency 20\n");
    process.exitCode = 1;
    return;
  }

  const result = await verifyEmail(email);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

run().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exitCode = 1;
});
