import dns from "node:dns/promises";
import { DnsResult } from "../types.js";
import { DnsCache } from "./cache.js";

type ResolveOk<T> = { ok: true; records: T };
type ResolveErr = { ok: false; error: unknown };
type ResolveResult<T> = ResolveOk<T> | ResolveErr;

function makeCacheKey(kind: string, name: string): string {
  return `${kind}:${name}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("DNS timeout")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function resolveCached<T>(
  cache: DnsCache | undefined,
  key: string,
  queryFn: () => Promise<T>
): Promise<ResolveResult<T>> {
  const hit = cache?.get<ResolveResult<T>>(key);
  if (hit) {
    return hit.data;
  }

  try {
    const records = await queryFn();
    const result: ResolveOk<T> = { ok: true, records };
    cache?.set(key, result);
    return result;
  } catch (error) {
    const result: ResolveErr = { ok: false, error };
    cache?.set(key, result);
    return result;
  }
}

async function resolveMx(
  domain: string,
  timeoutMs: number,
  cache?: DnsCache
): Promise<ResolveResult<Awaited<ReturnType<typeof dns.resolveMx>>>> {
  return resolveCached(cache, makeCacheKey("MX", domain), () =>
    withTimeout(dns.resolveMx(domain), timeoutMs)
  );
}

async function resolveTxt(
  name: string,
  timeoutMs: number,
  cache?: DnsCache
): Promise<ResolveResult<Awaited<ReturnType<typeof dns.resolveTxt>>>> {
  return resolveCached(cache, makeCacheKey("TXT", name), () =>
    withTimeout(dns.resolveTxt(name), timeoutMs)
  );
}

async function resolveA(
  domain: string,
  timeoutMs: number,
  cache?: DnsCache
): Promise<ResolveResult<Awaited<ReturnType<typeof dns.resolve4>>>> {
  return resolveCached(cache, makeCacheKey("A", domain), () =>
    withTimeout(dns.resolve4(domain), timeoutMs)
  );
}

async function resolveAAAA(
  domain: string,
  timeoutMs: number,
  cache?: DnsCache
): Promise<ResolveResult<Awaited<ReturnType<typeof dns.resolve6>>>> {
  return resolveCached(cache, makeCacheKey("AAAA", domain), () =>
    withTimeout(dns.resolve6(domain), timeoutMs)
  );
}

function flattenTxt(records: string[][]): string[] {
  return records.map((chunks) => chunks.join("")).filter(Boolean);
}

function hasSpfRecord(records: string[]): boolean {
  return records.some((record) => record.toLowerCase().startsWith("v=spf1"));
}

function hasDmarcRecord(records: string[]): boolean {
  return records.some((record) => record.toLowerCase().startsWith("v=dmarc1"));
}

function computeDomainExists(input: {
  mx: boolean;
  txtAtRoot: boolean;
  hasA: boolean;
  hasAAAA: boolean;
}): boolean {
  return input.mx || input.txtAtRoot || input.hasA || input.hasAAAA;
}

export async function checkDNS(
  domain: string,
  opts: { mx?: boolean; spf?: boolean; dmarc?: boolean; timeoutMs?: number },
  cache?: DnsCache
): Promise<DnsResult> {
  const timeoutMs = opts.timeoutMs ?? 4000;
  const checkMx = opts.mx !== false;
  const checkSpf = opts.spf !== false;
  const checkDmarc = opts.dmarc !== false;

  const result: DnsResult = {
    domain,
    domainExists: false,
  };

  const mxPromise = checkMx ? resolveMx(domain, timeoutMs, cache) : null;
  const spfTxtPromise = checkSpf ? resolveTxt(domain, timeoutMs, cache) : null;
  const dmarcTxtPromise = checkDmarc
    ? resolveTxt(`_dmarc.${domain}`, timeoutMs, cache)
    : null;
  const aPromise = resolveA(domain, timeoutMs, cache);
  const aaaaPromise = resolveAAAA(domain, timeoutMs, cache);

  const [mxRes, spfTxtRes, dmarcTxtRes, aRes, aaaaRes] = await Promise.all([
    mxPromise,
    spfTxtPromise,
    dmarcTxtPromise,
    aPromise,
    aaaaPromise,
  ]);

  if (checkMx) {
    if (mxRes && mxRes.ok && mxRes.records.length > 0) {
      result.mx = true;
      result.mxHosts = mxRes.records.map((record) => record.exchange);
    } else {
      result.mx = false;
    }
  }

  let rootTxtRecords: string[] = [];

  if (checkSpf) {
    if (spfTxtRes && spfTxtRes.ok) {
      rootTxtRecords = flattenTxt(spfTxtRes.records);
      result.spf = hasSpfRecord(rootTxtRecords);
    } else {
      result.spf = false;
    }
  }

  if (checkDmarc) {
    if (dmarcTxtRes && dmarcTxtRes.ok) {
      const dmarcRecords = flattenTxt(dmarcTxtRes.records);
      result.dmarc = hasDmarcRecord(dmarcRecords);
    } else {
      result.dmarc = false;
    }
  }

  const hasA = aRes.ok && aRes.records.length > 0;
  const hasAAAA = aaaaRes.ok && aaaaRes.records.length > 0;
  result.domainExists = computeDomainExists({
    mx: result.mx === true,
    txtAtRoot: rootTxtRecords.length > 0,
    hasA,
    hasAAAA,
  });

  return result;
}
