# Architecture and Flow Guide

This document explains how `pm-email-validator` works end-to-end, from a single API call to final verdict and score.

If you felt "I can read code but I can't see the flow", this is for you.

## 1) Mental Model

Think of the package as 3 layers:

1. Public API layer
2. Validation engine layer
3. Signal/data layer

The API layer receives input and options.
The engine layer runs checks in a fixed sequence.
The signal/data layer provides specialized checks (syntax, DNS, typo, disposable, etc.).

## 2) Public Entry Points

Main exports are in `src/index.ts`.

The two most important functions:

- `verifyEmail(email, options?)`
- `debugVerifyEmail(email, options?)`

### `verifyEmail`

Use this in production apps.

- Default output: lean (`output: "basic"`)
- Optional detailed output: `output: "full"`
- No trace by default (faster)

### `debugVerifyEmail`

Use this for debugging and understanding behavior.

- Always full result
- Includes `trace[]` with step-by-step execution details

## 3) Core Engine (`src/verify.ts`)

`src/verify.ts` orchestrates everything.

### High-level flow

1. Resolve options and defaults
2. Normalize + syntax gate (early return on invalid)
3. Run signal checks
4. Apply score deductions
5. Compute verdict from thresholds
6. Build basic or full result shape

### Internal runner

Both public APIs call one internal function:

- `runValidation(email, options, runOptions)`

`runOptions` controls performance behavior:

- `collectTrace` (true only for debug path)
- `includeDetails` (true for full output, false for basic output)

This keeps logic centralized while avoiding extra work in fast mode.

## 4) Detailed Validation Sequence

Inside `runValidation`, checks run in deterministic order:

1. `normalizeEmail` (`src/core/normalize.ts`)
2. `validateSyntax` (`src/core/syntax.ts`)
3. `checkDNS` (`src/core/dns.ts`)
4. `detectProvider` (`src/core/provider.ts`) [only when details needed]
5. `getCanonicalEmail` (`src/core/canonical.ts`)
6. `isRoleEmail` (`src/core/roleEmail.ts`) [optional]
7. `detectPatterns` (`src/core/patterns.ts`) [optional]
8. plus-addressing signal from canonical result
9. `suggestTypo` (`src/core/typo.ts`) [optional]
10. `checkDisposable` (`src/core/disposable.ts`) [optional]
11. DNS penalties (no MX/SPF/DMARC)
12. `probeSmtp` (`src/core/smtp.ts`) [optional]
13. `checkCatchAll` (`src/core/catchAll.ts`) [optional]
14. `clampScore` + `computeVerdict` (`src/core/scoring.ts`)

## 5) Scoring System

Starts at `100`.

Each negative signal subtracts from score using configurable `weights`.
Final score is clamped between `0` and `100`.
Verdict comes from thresholds:

- `valid`
- `risky`
- `unknown`
- `invalid`

Default weights and thresholds live in `src/core/scoring.ts`.

## 6) Basic vs Full Output

Defined in `VerifyOptions` (`src/types.ts`):

- `output: "basic"` (default)
- `output: "full"`

### Basic output

Returns essentials:

- verdict
- confidence
- reasons
- checks

Skips detailed payload assembly to reduce overhead.

### Full output

Adds:

- `intelligence`
- `risks`
- `scoreBreakdown`

## 7) Caching and Rate Limiting

### DNS cache

- `src/core/cache.ts` defines `DnsCache`
- `src/verify.ts` uses a shared cache pool (`dnsCachePool`) keyed by cache config
- Improves repeated lookup performance across calls

### SMTP limiter

- `src/core/limiter.ts` defines `RateLimiter`
- `src/verify.ts` keeps limiter instances in `limiterPool` by configured limit
- Prevents abusive SMTP probing rates

## 8) Disposable / Temp Mail Logic

Main logic:

- `checkDisposable(domain, provider?)` in `src/core/disposable.ts`

Data sources:

- Built-in set: `src/data/disposable.ts`
- File-based custom provider: `src/core/disposableFileProvider.ts`

Recommended maintained list in this repo:

- `data/disposable_domains.txt`

## 9) Batch APIs

`src/batch.ts` provides:

- `verifyEmailBatch` (concurrency-controlled array processing)
- `verifyEmailStream` (async generator for streaming large lists)
- convenience helpers (`quickCheckBatch`, `filterValidEmails`, `partitionByVerdict`)

## 10) Build and Packaging Flow

### Source

- TypeScript in `src/` and CLI entry in `bin/`

### Build

- `npm run build` -> `tsup`
- Config: `tsup.config.ts`
- Output in `dist/`:
  - ESM
  - CJS
  - `.d.ts` types

### Package contract (`package.json`)

- `name`: npm package name
- `exports`: module entry map
- `types`: TypeScript declarations
- `bin`: CLI command target
- `files`: what gets published
- `prepublishOnly`: quality gate (typecheck + build + tests)

## 11) Where to Change What

If you want to...

- tweak verdict logic: `src/core/scoring.ts`
- add/remove signal checks: `src/verify.ts`
- improve typo suggestions: `src/core/typo.ts` + `src/data/typo.ts`
- update disposable domains: `data/disposable_domains.txt` and/or `src/data/disposable.ts`
- tune DNS behavior: `src/core/dns.ts`
- tune SMTP behavior: `src/core/smtp.ts` + `src/core/limiter.ts`

## 12) Fast Debug Recipe

When unsure why a result happened:

1. Run `debugVerifyEmail(email, { output: "full" })`
2. Read `trace` steps in order
3. Inspect `scoreBreakdown` impacts
4. Confirm final `confidence` and `verdict`

This is the quickest way to connect code paths to output.
