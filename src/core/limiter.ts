export class RateLimiter {
  private windowMs: number;
  private limit: number;
  private buckets = new Map<string, number[]>();

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existing = this.buckets.get(key) ?? [];
    const fresh = existing.filter((ts) => ts >= windowStart);
    if (fresh.length >= this.limit) {
      this.buckets.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    return true;
  }
}
