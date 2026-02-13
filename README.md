# pm-email-validator

[![npm version](https://img.shields.io/npm/v/pm-email-validator.svg)](https://www.npmjs.com/package/pm-email-validator)
![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Deliverability-first email validation for Node.js with explainable results.

`pm-email-validator` is built for real product flows where syntax-only checks are not enough. It combines syntax validation, typo detection, disposable-domain checks, DNS signals, optional SMTP probing, and a transparent scoring model.

## Why This Package

Most validators answer only one question: "Does this look like an email?"

This package answers the questions teams actually care about:

- Is this likely deliverable?
- Is this disposable/temp mail?
- Is this risky for B2B outreach or user quality?
- Why did we classify it this way?

## Features

- Lean default response for fast production usage
- Optional full detail mode for intelligence/risk analysis
- Deterministic scoring with configurable weights and thresholds
- DNS checks: MX, SPF, DMARC, A/AAAA existence
- Optional SMTP probing (rate-limited, best-effort)
- Catch-all detection (optional)
- Role-email and suspicious pattern detection
- Batch validation helpers and stream API
- CLI for one-off and file-based validation
- Debug API with step-by-step trace

## Install

```bash
npm install pm-email-validator
```

## Node Version

- Node.js `>= 18`

## Quick Start

```ts
import { verifyEmail } from "pm-email-validator";

const result = await verifyEmail("user@gmial.com");
console.log(result.verdict);
console.log(result.reasons);
```

## Output Modes

### Default: `output: "basic"`

`verifyEmail()` returns a lean payload by default.

```ts
import { verifyEmail } from "pm-email-validator";

const result = await verifyEmail("user@example.com");
// lean response
```

### Detailed: `output: "full"`

Use this when you need intelligence and score internals.

```ts
const detailed = await verifyEmail("user@example.com", { output: "full" });
// includes intelligence, risks, scoreBreakdown
```

### Trace: `debugVerifyEmail()`

Use this for debugging and education.

```ts
import { debugVerifyEmail } from "pm-email-validator";

const { result, trace } = await debugVerifyEmail("user@gmial.com");
console.log(result.verdict);
console.log(trace);
```

## Result Types

### `PMEmailResult` (lean)

```ts
export interface PMEmailResult {
  email: string;
  normalizedEmail: string;
  verdict: "valid" | "risky" | "unknown" | "invalid";
  confidence: number;
  reasons: string[];
  checks: {
    syntax: { ok: boolean; mode: "basic" | "rfc"; reason?: string };
    typo: { ok: boolean; suggestedEmail?: string };
    disposable: { ok: boolean; source?: string };
    dns: {
      domainExists?: boolean;
      mx?: boolean;
      spf?: boolean;
      dmarc?: boolean;
      mxHosts?: string[];
    };
    smtp: { enabled: boolean; status: "valid" | "invalid" | "unknown"; code?: string };
    catchAll?: { checked: boolean; isCatchAll: boolean; confidence: string };
    roleEmail: { isRole: boolean; prefix?: string; category?: string };
    patterns: { detected: boolean; signals: string[] };
  };
}
```

### `PMEmailDetailedResult` (full)

```ts
export interface PMEmailDetailedResult extends PMEmailResult {
  intelligence: Intelligence;
  risks: RiskItem[];
  scoreBreakdown: ScoreBreakdownItem[];
}
```

## Validation Flow

The internal pipeline is deterministic and ordered:

1. Normalize input
2. Syntax validation (`basic` or `rfc`)
3. DNS checks
4. Provider detection
5. Canonicalization
6. Role-email detection
7. Pattern detection
8. Typo detection
9. Disposable-domain detection
10. DNS score impacts
11. Optional SMTP probe
12. Optional catch-all check
13. Final score and verdict

## Configuration

```ts
import { verifyEmail } from "pm-email-validator";

const result = await verifyEmail("person@example.com", {
  output: "basic", // "basic" (default) | "full"
  mode: "basic", // "basic" | "rfc"
  typoSuggestions: true,
  disposable: { enabled: true },
  dns: { mx: true, spf: true, dmarc: true, timeoutMs: 4000 },
  smtp: { enabled: false, timeoutMs: 4000, maxConnectionsPerDomainPerMinute: 10 },
  catchAll: { enabled: false, timeoutMs: 5000 },
  patterns: { enabled: true },
  roleEmail: { enabled: true },
  scoring: {
    weights: {
      typo: 25,
      disposable: 60,
      noMx: 50,
      noSpf: 10,
      noDmarc: 10,
      smtpInvalid: 80,
    },
    thresholds: { valid: 85, risky: 60, unknown: 30 },
  },
  cache: { dnsTtlMs: 10 * 60 * 1000, maxEntries: 2000 },
});
```

## Disposable / Temp-Mail Handling

This package treats temp mail as disposable mail.

### Built-in list

By default, disposable checks use the bundled list.

### Custom updatable list from file

Use a file-based provider for easy maintenance:

```ts
import { verifyEmail, loadDisposableProviderFromFile } from "pm-email-validator";

const provider = loadDisposableProviderFromFile("data/disposable_domains.txt");

const result = await verifyEmail("user@example.com", {
  disposable: { enabled: true, provider },
});
```

- File format: one domain per line
- Comment lines start with `#`
- Recommended source file in this repo: `data/disposable_domains.txt`

## Presets

Available presets:

- `quick`
- `standard`
- `thorough`
- `b2b`
- `strict`

```ts
import { getPresetOptions, verifyEmail } from "pm-email-validator";

const options = getPresetOptions("standard", {
  output: "basic",
});

const result = await verifyEmail("user@example.com", options);
```

## API Reference (Core)

- `verifyEmail(email, options?)` -> `Promise<PMEmailResult | PMEmailDetailedResult>`
- `debugVerifyEmail(email, options?)` -> `Promise<DebugResult>`
- `verifyEmailBatch(emails, options?)`
- `verifyEmailStream(emails, options?)`
- `validateSyntax(email, mode?)`
- `suggestTypo(email)`
- `checkDisposable(domain, provider?)`
- `checkDNS(domain, opts, cache?)`

See `src/index.ts` for full export surface.

## CLI Usage

Single email:

```bash
pm-email-validator "user@gmail.com"
```

File mode (first CSV column is email):

```bash
pm-email-validator --file emails.csv --out report.json --concurrency 20
```

## Local HTTP API (Development)

Start API:

```bash
npm run dev:api
```

Health check:

```bash
GET http://localhost:3000/health
```

Validate:

```bash
POST http://localhost:3000/verify
Content-Type: application/json

{
  "email": "user@gmail.com",
  "options": {
    "output": "basic",
    "mode": "basic"
  }
}
```

Debug trace:

```bash
POST http://localhost:3000/verify/debug
Content-Type: application/json

{
  "email": "user@gmail.com",
  "options": {
    "output": "full",
    "mode": "rfc"
  }
}
```

## Benchmark

Run local throughput benchmark:

```bash
npm run bench
```

With flags:

```bash
npm run bench -- --iterations=5000 --concurrency=50 --output=basic
npm run bench -- --iterations=2000 --concurrency=20 --output=full
```

## Performance Notes

For production throughput:

- Use `output: "basic"` unless you need full intelligence payload
- Keep SMTP disabled unless your use case requires mailbox probing
- Keep DNS cache enabled (default)
- Use batch APIs for large imports

## Comparison

| Approach | Fast | Disposable Detection | DNS Signals | SMTP Option | Explainable Scoring |
|---|---:|---:|---:|---:|---:|
| Regex-only validator | Yes | No | No | No | No |
| Syntax + MX checker | Yes | No | Partial | No | Limited |
| External black-box API | Varies | Varies | Varies | Varies | Usually limited |
| `pm-email-validator` | Yes (basic mode) | Yes | Yes | Yes (opt-in) | Yes |

## Security Notes

SMTP probing is opt-in and can be considered intrusive by some providers.

- Respect provider policies and legal requirements
- Expect ambiguous `unknown` outcomes (greylisting, catch-all, policy blocks)

## Roadmap

- Improve typo intelligence with curated typo-to-canonical mapping
- Add optional provider metadata packs (industry/domain enrichment)
- Add benchmark profiles for network-heavy scenarios
- Expand test matrix with real-world anonymized email fixtures
- Add optional plugin hooks for custom risk signals

## Development

Install:

```bash
npm install
```

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Typecheck:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Add or update tests for your change
4. Run `npm test` and `npm run typecheck`
5. Open a PR with:
   - what changed
   - why it changed
   - any compatibility notes

### Contribution Guidelines

- Keep public API changes explicit in PR description
- Prefer deterministic behavior over opaque heuristics
- Keep default path fast (`output: "basic"`)
- Add tests for new scoring or classification logic

## License

MIT
