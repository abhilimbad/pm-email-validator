export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class DnsCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(opts?: { maxEntries?: number; ttlMs?: number }) {
    this.maxEntries = opts?.maxEntries ?? 2000;
    this.ttlMs = opts?.ttlMs ?? 10 * 60 * 1000;
  }

  get<T>(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry as CacheEntry<T>;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs)
    };
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, entry);
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) this.store.delete(oldestKey);
    }
  }
}
