import { Verdict, Weights } from "../types.js";

export const DEFAULT_WEIGHTS: Weights = {
  typo: 25,
  disposable: 60,
  noMx: 50,
  noSpf: 10,
  noDmarc: 10,
  smtpInvalid: 80,
  smtpUnknown: 5,
  catchAll: 10,
  roleEmail: 5,
  patternHigh: 20,
  patternMedium: 10,
  patternLow: 5,
  plusAddressing: 3,
};

export const DEFAULT_THRESHOLDS = {
  valid: 85,
  risky: 60,
  unknown: 30
};

export function computeVerdict(score: number, thresholds?: {
  valid: number;
  risky: number;
  unknown: number;
}): Verdict {
  const t = thresholds ?? DEFAULT_THRESHOLDS;
  if (score >= t.valid) return "valid";
  if (score >= t.risky) return "risky";
  if (score >= t.unknown) return "unknown";
  return "invalid";
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
