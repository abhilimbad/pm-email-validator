import { performance } from "node:perf_hooks";
import { verifyEmail } from "../src/verify.js";

const DEFAULT_ITERATIONS = 1000;
const DEFAULT_CONCURRENCY = 20;

type BenchCase = {
  name: string;
  email: string;
};

const cases: BenchCase[] = [
  { name: "clean", email: "user@gmail.com" },
  { name: "typo", email: "user@gmial.com" },
  { name: "disposable", email: "temp@mailinator.com" },
  { name: "role", email: "admin@example.com" },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const iterationsArg = args.find((arg) => arg.startsWith("--iterations="));
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));
  const outputArg = args.find((arg) => arg.startsWith("--output="));

  return {
    iterations: Math.max(1, Number(iterationsArg?.split("=")[1] ?? DEFAULT_ITERATIONS)),
    concurrency: Math.max(1, Number(concurrencyArg?.split("=")[1] ?? DEFAULT_CONCURRENCY)),
    output: (outputArg?.split("=")[1] === "full" ? "full" : "basic") as "basic" | "full",
  };
}

async function runQueue<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current]!);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const { iterations, concurrency, output } = parseArgs();
  const workload: BenchCase[] = [];

  for (let i = 0; i < iterations; i += 1) {
    workload.push(cases[i % cases.length]!);
  }

  const started = performance.now();

  await runQueue(workload, concurrency, async (item) => {
    await verifyEmail(item.email, {
      output,
      smtp: { enabled: false },
      catchAll: { enabled: false },
    });
  });

  const durationMs = performance.now() - started;
  const throughput = (iterations / durationMs) * 1000;
  const avgMs = durationMs / iterations;

  console.log("pm-email-validator benchmark");
  console.log(`iterations=${iterations}`);
  console.log(`concurrency=${concurrency}`);
  console.log(`output=${output}`);
  console.log(`duration_ms=${durationMs.toFixed(2)}`);
  console.log(`avg_ms_per_email=${avgMs.toFixed(3)}`);
  console.log(`throughput_emails_per_sec=${throughput.toFixed(2)}`);
}

main().catch((error) => {
  console.error("benchmark failed", error);
  process.exitCode = 1;
});
