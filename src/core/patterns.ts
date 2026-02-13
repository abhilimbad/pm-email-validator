/**
 * Pattern detection module for identifying suspicious email patterns.
 * Detects keyboard walks, gibberish, test emails, and other signals.
 */

export type PatternSeverity = "high" | "medium" | "low";
export type PatternType =
  | "keyboard_walk"
  | "sequential"
  | "repeated_chars"
  | "test_pattern"
  | "gibberish"
  | "numeric_only"
  | "too_short"
  | "suspicious_tld";

export interface PatternSignal {
  /** Type of pattern detected */
  type: PatternType;
  /** Human-readable description */
  description: string;
  /** Severity level */
  severity: PatternSeverity;
  /** The pattern/value that was matched */
  match?: string;
}

/**
 * Common keyboard walk patterns (QWERTY layout)
 */
const KEYBOARD_WALKS = [
  // Horizontal rows
  "qwerty", "qwert", "werty", "qwertyuiop",
  "asdf", "asdfg", "asdfgh", "asdfghjkl",
  "zxcv", "zxcvb", "zxcvbn", "zxcvbnm",
  // Vertical patterns
  "qaz", "qazwsx", "qazwsxedc",
  "wsx", "wsxedc", "wsxedcrfv",
  "edc", "edcrfv", "edcrfvtgb",
  "rfv", "rfvtgb",
  "tgb", "tgbyhn",
  "yhn", "yhnujm",
  // Diagonals
  "qazxsw", "zaqxsw", "zaqwsx",
  "plokij", "okijuh", "ijuhyg",
  // Number row
  "12345", "123456", "1234567", "12345678", "123456789",
  "09876", "098765", "0987654", "09876543",
  // Common patterns
  "qwer", "rewq", "poiu", "uiop",
  "lkjh", "hjkl", "mnbv", "vbnm",
];

/**
 * Test/fake email patterns
 */
const TEST_PATTERNS = [
  // Exact matches
  "test", "testing", "tester", "testuser", "testaccount", "test123",
  "fake", "fakeuser", "fakeemail", "fake123",
  "sample", "sampleuser", "sample123",
  "demo", "demouser", "demo123",
  "example", "exampleuser", "example123",
  "temp", "tempuser", "temporary", "temp123",
  "tmp", "tmpuser", "tmp123",
  "dummy", "dummyuser", "dummy123",
  "foo", "foobar", "foobaz",
  "bar", "barbaz",
  "baz",
  "user", "user1", "user123", "newuser",
  "admin", "administrator", "admin123",
  "root", "root123",
  "guest", "guest123",
  "nobody",
  "null", "void",
  "xxx", "xxxx", "xxxxx",
  "yyy", "yyyy", "yyyyy",
  "zzz", "zzzz", "zzzzz",
  "aaa", "aaaa", "aaaaa",
  "abc", "abcd", "abcde", "abcdef",
  "abc123", "abc1234",
  "aa", "bb", "cc", "dd", "ee", "ff",
  "a1", "a12", "a123",
  "noemail", "no-email", "noemail123",
  "email", "email123", "myemail",
  "me", "me123",
];

/**
 * Sequential letter patterns
 */
const SEQUENTIAL_LETTERS = /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i;

/**
 * Repeated character pattern (same char 3+ times)
 */
const REPEATED_CHARS = /(.)\1{2,}/;

/**
 * Consonant cluster pattern for gibberish detection
 * 5+ consonants in a row is very unusual in real names
 */
const CONSONANT_CLUSTER = /[bcdfghjklmnpqrstvwxz]{5,}/i;

/**
 * Vowel-less pattern (no vowels at all in 4+ char string)
 */
const NO_VOWELS = /^[^aeiou]{4,}$/i;

/**
 * Numeric only local part
 */
const NUMERIC_ONLY = /^\d+$/;

/**
 * Check if a string is a keyboard walk
 */
function isKeyboardWalk(str: string): string | null {
  const lower = str.toLowerCase();
  for (const walk of KEYBOARD_WALKS) {
    if (lower.includes(walk)) {
      return walk;
    }
  }
  return null;
}

/**
 * Check if string is a test pattern
 */
function isTestPattern(str: string): string | null {
  const lower = str.toLowerCase().replace(/[._-]/g, "");

  // Exact match
  for (const pattern of TEST_PATTERNS) {
    if (lower === pattern) {
      return pattern;
    }
  }

  // Starts with test pattern followed by numbers
  for (const pattern of TEST_PATTERNS) {
    if (lower.startsWith(pattern) && /^\d*$/.test(lower.slice(pattern.length))) {
      return pattern;
    }
  }

  return null;
}

/**
 * Check if string appears to be gibberish
 */
function isGibberish(str: string): boolean {
  // Too short to determine
  if (str.length < 4) return false;

  // Check for consonant clusters
  if (CONSONANT_CLUSTER.test(str)) return true;

  // Check for no vowels in longer strings
  if (str.length >= 5 && NO_VOWELS.test(str)) return true;

  // Calculate consonant to vowel ratio
  const vowels = (str.match(/[aeiou]/gi) || []).length;
  const consonants = (str.match(/[bcdfghjklmnpqrstvwxz]/gi) || []).length;

  if (consonants > 0 && vowels === 0 && str.length > 4) return true;
  if (consonants > 0 && consonants / (vowels || 1) > 5) return true;

  return false;
}

/**
 * Analyze an email's local part for suspicious patterns.
 *
 * @param localPart - The local part of the email (before @)
 * @returns Array of detected pattern signals
 */
export function detectPatterns(localPart: string): PatternSignal[] {
  const signals: PatternSignal[] = [];
  const cleaned = localPart.replace(/[._+-]/g, "");

  // Too short
  if (cleaned.length < 3) {
    signals.push({
      type: "too_short",
      description: "Local part is very short",
      severity: "low",
      match: localPart,
    });
  }

  // Keyboard walk
  const keyboardWalk = isKeyboardWalk(cleaned);
  if (keyboardWalk) {
    signals.push({
      type: "keyboard_walk",
      description: "Contains keyboard walk pattern",
      severity: "high",
      match: keyboardWalk,
    });
  }

  // Test pattern
  const testPattern = isTestPattern(localPart);
  if (testPattern) {
    signals.push({
      type: "test_pattern",
      description: "Appears to be a test/fake email",
      severity: "high",
      match: testPattern,
    });
  }

  // Sequential letters (abc, bcd, etc.)
  const seqMatch = cleaned.match(SEQUENTIAL_LETTERS);
  if (seqMatch && cleaned.length <= seqMatch[0].length + 3) {
    signals.push({
      type: "sequential",
      description: "Contains sequential letter pattern",
      severity: "medium",
      match: seqMatch[0],
    });
  }

  // Repeated characters
  const repeatMatch = cleaned.match(REPEATED_CHARS);
  if (repeatMatch && repeatMatch[0].length >= 3) {
    signals.push({
      type: "repeated_chars",
      description: "Contains repeated characters",
      severity: "medium",
      match: repeatMatch[0],
    });
  }

  // Numeric only
  if (NUMERIC_ONLY.test(cleaned)) {
    signals.push({
      type: "numeric_only",
      description: "Local part is numeric only",
      severity: "low",
      match: cleaned,
    });
  }

  // Gibberish (only if no other patterns detected)
  if (signals.length === 0 && isGibberish(cleaned)) {
    signals.push({
      type: "gibberish",
      description: "Appears to be random characters",
      severity: "medium",
      match: cleaned,
    });
  }

  return signals;
}

/**
 * Get the highest severity from a list of signals.
 */
export function getHighestSeverity(signals: PatternSignal[]): PatternSeverity | null {
  if (signals.length === 0) return null;

  if (signals.some((s) => s.severity === "high")) return "high";
  if (signals.some((s) => s.severity === "medium")) return "medium";
  return "low";
}

/**
 * Check if local part has any high-severity patterns.
 */
export function hasHighSeverityPatterns(localPart: string): boolean {
  const signals = detectPatterns(localPart);
  return getHighestSeverity(signals) === "high";
}

/**
 * Quick check if email looks like a test email.
 */
export function looksLikeTestEmail(email: string): boolean {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;

  const localPart = email.slice(0, atIndex);
  return isTestPattern(localPart) !== null;
}
