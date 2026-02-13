/**
 * Batch email validation module.
 * Efficiently validates large numbers of emails with concurrency control.
 */

import { PMEmailResult, BatchOptions, BatchResult } from "./types.js";
import { verifyEmail } from "./verify.js";

/**
 * Default batch options.
 */
const DEFAULT_BATCH_OPTIONS: Required<Pick<BatchOptions, "concurrency" | "continueOnError">> = {
  concurrency: 10,
  continueOnError: true,
};

/**
 * Validate multiple emails in parallel with concurrency control.
 *
 * @param emails - Array of email addresses to validate
 * @param options - Batch validation options
 * @returns Batch result with all validation results
 *
 * @example
 * ```typescript
 * const result = await verifyEmailBatch(
 *   ["user1@gmail.com", "user2@yahoo.com", "test@mailinator.com"],
 *   {
 *     concurrency: 20,
 *     onProgress: (completed, total) => {
 *       console.log(`Progress: ${completed}/${total}`);
 *     }
 *   }
 * );
 *
 * console.log(`Valid: ${result.results.filter(r => r.result?.verdict === 'valid').length}`);
 * ```
 */
export async function verifyEmailBatch(
  emails: string[],
  options: BatchOptions = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const concurrency = options.concurrency ?? DEFAULT_BATCH_OPTIONS.concurrency;
  const continueOnError = options.continueOnError ?? DEFAULT_BATCH_OPTIONS.continueOnError;
  const onProgress = options.onProgress;

  // Extract verify options (everything except batch-specific options)
  const { concurrency: _, onProgress: __, continueOnError: ___, ...verifyOptions } = options;

  const results: BatchResult["results"] = [];
  let completed = 0;
  let successful = 0;
  let failed = 0;

  // Process emails in batches based on concurrency
  const queue = [...emails];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);

    const batchPromises = batch.map(async (email) => {
      try {
        const result = await verifyEmail(email, verifyOptions);
        return { email, result };
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        return {
          email,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      results.push(result);
      completed++;

      if (result.result) {
        successful++;
      } else {
        failed++;
      }

      if (onProgress) {
        onProgress(completed, emails.length);
      }
    }
  }

  return {
    total: emails.length,
    successful,
    failed,
    results,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Validate emails using a streaming approach with async generator.
 * Useful for processing very large lists where you want to handle results as they come.
 *
 * @param emails - Iterable of email addresses
 * @param options - Validation options
 * @yields Individual validation results as they complete
 *
 * @example
 * ```typescript
 * for await (const result of verifyEmailStream(emailList, { concurrency: 20 })) {
 *   if (result.result?.verdict === 'valid') {
 *     validEmails.push(result.email);
 *   }
 * }
 * ```
 */
export async function* verifyEmailStream(
  emails: Iterable<string> | AsyncIterable<string>,
  options: BatchOptions = {}
): AsyncGenerator<{ email: string; result?: PMEmailResult; error?: string }> {
  const concurrency = options.concurrency ?? DEFAULT_BATCH_OPTIONS.concurrency;
  const continueOnError = options.continueOnError ?? DEFAULT_BATCH_OPTIONS.continueOnError;

  // Extract verify options
  const { concurrency: _, onProgress: __, continueOnError: ___, ...verifyOptions } = options;

  // Buffer for processing
  const buffer: string[] = [];
  const pending: Promise<{ email: string; result?: PMEmailResult; error?: string }>[] = [];

  const processEmail = async (email: string) => {
    try {
      const result = await verifyEmail(email, verifyOptions);
      return { email, result };
    } catch (error) {
      if (!continueOnError) {
        throw error;
      }
      return {
        email,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  // Process emails
  for await (const email of emails as AsyncIterable<string>) {
    buffer.push(email);

    // Start processing when buffer reaches concurrency limit
    if (buffer.length >= concurrency) {
      pending.push(processEmail(buffer.shift()!));
    }

    // Yield completed results
    while (pending.length >= concurrency) {
      const result = await pending.shift()!;
      yield result;
    }
  }

  // Start remaining buffered emails
  while (buffer.length > 0) {
    pending.push(processEmail(buffer.shift()!));
  }

  // Yield remaining results
  while (pending.length > 0) {
    const result = await pending.shift()!;
    yield result;
  }
}

/**
 * Quick batch validation that only checks syntax and disposable status.
 * Much faster than full validation, good for initial filtering.
 *
 * @param emails - Array of email addresses
 * @returns Array of quick check results
 */
export async function quickCheckBatch(
  emails: string[]
): Promise<Array<{ email: string; valid: boolean; reason?: string }>> {
  const results: Array<{ email: string; valid: boolean; reason?: string }> = [];

  for (const email of emails) {
    const result = await verifyEmail(email, {
      dns: { mx: false, spf: false, dmarc: false },
      smtp: { enabled: false },
      catchAll: { enabled: false },
    });

    results.push({
      email,
      valid: result.verdict !== "invalid",
      reason: result.reasons[0],
    });
  }

  return results;
}

/**
 * Filter an array of emails to only include likely valid ones.
 * Uses quick validation for speed.
 *
 * @param emails - Array of email addresses
 * @param options - Validation options
 * @returns Array of emails that passed validation
 */
export async function filterValidEmails(
  emails: string[],
  options: BatchOptions = {}
): Promise<string[]> {
  const result = await verifyEmailBatch(emails, options);

  return result.results
    .filter((r) => r.result && (r.result.verdict === "valid" || r.result.verdict === "risky"))
    .map((r) => r.email);
}

/**
 * Partition emails by verdict.
 *
 * @param emails - Array of email addresses
 * @param options - Validation options
 * @returns Object with arrays partitioned by verdict
 */
export async function partitionByVerdict(
  emails: string[],
  options: BatchOptions = {}
): Promise<{
  valid: string[];
  risky: string[];
  unknown: string[];
  invalid: string[];
}> {
  const result = await verifyEmailBatch(emails, options);

  const partitioned = {
    valid: [] as string[],
    risky: [] as string[],
    unknown: [] as string[],
    invalid: [] as string[],
  };

  for (const r of result.results) {
    if (r.result) {
      partitioned[r.result.verdict].push(r.email);
    } else {
      // Errors go to invalid
      partitioned.invalid.push(r.email);
    }
  }

  return partitioned;
}
