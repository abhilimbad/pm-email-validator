/**
 * Email provider definitions with features, MX patterns, and metadata.
 * This is the core intelligence database for provider detection.
 */

export interface ProviderFeatures {
  /** Gmail: j.o.h.n = john */
  dotInsensitive: boolean;
  /** user+tag@domain -> user@domain */
  plusAddressing: boolean;
  /** user-alias@domain support */
  dashAddressing?: boolean;
  /** Can create separate aliases */
  aliasSupport: boolean;
}

export type ProviderType = "free" | "business" | "privacy" | "education" | "government";
export type ProviderReputation = "high" | "medium" | "low";

export interface ProviderDefinition {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Known domains for this provider */
  domains: string[];
  /** MX hostname patterns (supports wildcards with *) */
  mxPatterns: string[];
  /** Provider feature set */
  features: ProviderFeatures;
  /** Provider type classification */
  type: ProviderType;
  /** Reputation level */
  reputation: ProviderReputation;
}

/**
 * Comprehensive provider database
 */
export const PROVIDERS: Record<string, ProviderDefinition> = {
  google: {
    id: "google",
    name: "Gmail",
    domains: [
      "gmail.com",
      "googlemail.com",
      "google.com",
    ],
    mxPatterns: [
      "aspmx.l.google.com",
      "*.aspmx.l.google.com",
      "aspmx*.googlemail.com",
      "alt*.aspmx.l.google.com",
      "*.google.com",
      "smtp.google.com",
      "smtp-relay.google.com",
    ],
    features: {
      dotInsensitive: true,
      plusAddressing: true,
      aliasSupport: false,
    },
    type: "free",
    reputation: "high",
  },

  microsoft: {
    id: "microsoft",
    name: "Outlook",
    domains: [
      "outlook.com",
      "hotmail.com",
      "live.com",
      "msn.com",
      "hotmail.co.uk",
      "hotmail.fr",
      "hotmail.de",
      "hotmail.it",
      "hotmail.es",
      "live.co.uk",
      "live.fr",
      "live.de",
      "live.it",
      "outlook.co.uk",
      "outlook.fr",
      "outlook.de",
    ],
    mxPatterns: [
      "*.mail.protection.outlook.com",
      "*.olc.protection.outlook.com",
      "mail.protection.outlook.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "free",
    reputation: "high",
  },

  yahoo: {
    id: "yahoo",
    name: "Yahoo Mail",
    domains: [
      "yahoo.com",
      "ymail.com",
      "rocketmail.com",
      "yahoo.co.uk",
      "yahoo.co.in",
      "yahoo.ca",
      "yahoo.com.au",
      "yahoo.fr",
      "yahoo.de",
      "yahoo.it",
      "yahoo.es",
      "yahoo.co.jp",
      "myyahoo.com",
    ],
    mxPatterns: [
      "*.yahoodns.net",
      "mx-*.mail.yahoo.com",
      "mx*.mail.yahoo.com",
      "*.am0.yahoodns.net",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: false,
      dashAddressing: true,
      aliasSupport: true,
    },
    type: "free",
    reputation: "high",
  },

  proton: {
    id: "proton",
    name: "Proton Mail",
    domains: [
      "proton.me",
      "protonmail.com",
      "protonmail.ch",
      "pm.me",
    ],
    mxPatterns: [
      "mail.protonmail.ch",
      "mailsec.protonmail.ch",
      "*.protonmail.ch",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "privacy",
    reputation: "high",
  },

  apple: {
    id: "apple",
    name: "iCloud",
    domains: [
      "icloud.com",
      "me.com",
      "mac.com",
    ],
    mxPatterns: [
      "mx*.mail.icloud.com",
      "*.mail.icloud.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "free",
    reputation: "high",
  },

  aol: {
    id: "aol",
    name: "AOL Mail",
    domains: [
      "aol.com",
      "aim.com",
      "aol.co.uk",
      "aol.de",
      "aol.fr",
    ],
    mxPatterns: [
      "mx-aol.mail.gm0.yahoodns.net",
      "*.yahoodns.net",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: false,
    },
    type: "free",
    reputation: "medium",
  },

  zoho: {
    id: "zoho",
    name: "Zoho Mail",
    domains: [
      "zoho.com",
      "zohomail.com",
      "zoho.in",
      "zoho.eu",
    ],
    mxPatterns: [
      "mx*.zoho.com",
      "mx*.zoho.eu",
      "mx*.zoho.in",
      "*.zoho.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "free",
    reputation: "high",
  },

  fastmail: {
    id: "fastmail",
    name: "Fastmail",
    domains: [
      "fastmail.com",
      "fastmail.fm",
      "messagingengine.com",
    ],
    mxPatterns: [
      "in*-smtp.messagingengine.com",
      "*.messagingengine.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "privacy",
    reputation: "high",
  },

  gmx: {
    id: "gmx",
    name: "GMX Mail",
    domains: [
      "gmx.com",
      "gmx.net",
      "gmx.de",
      "gmx.at",
      "gmx.ch",
      "gmx.us",
    ],
    mxPatterns: [
      "mx*.gmx.net",
      "mx*.gmx.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: false,
    },
    type: "free",
    reputation: "medium",
  },

  mailcom: {
    id: "mailcom",
    name: "Mail.com",
    domains: [
      "mail.com",
      "email.com",
      "usa.com",
      "myself.com",
      "consultant.com",
      "post.com",
      "europe.com",
      "asia.com",
      "iname.com",
      "writeme.com",
      "dr.com",
      "engineer.com",
      "cheerful.com",
      "techie.com",
      "linuxmail.org",
    ],
    mxPatterns: [
      "mx*.mail.com",
      "*.mail.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: false,
    },
    type: "free",
    reputation: "medium",
  },

  yandex: {
    id: "yandex",
    name: "Yandex Mail",
    domains: [
      "yandex.com",
      "yandex.ru",
      "ya.ru",
      "yandex.ua",
      "yandex.by",
      "yandex.kz",
    ],
    mxPatterns: [
      "mx.yandex.net",
      "mx.yandex.ru",
      "*.yandex.net",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "free",
    reputation: "medium",
  },

  tutanota: {
    id: "tutanota",
    name: "Tutanota",
    domains: [
      "tutanota.com",
      "tutanota.de",
      "tutamail.com",
      "tuta.io",
      "keemail.me",
    ],
    mxPatterns: [
      "mail.tutanota.de",
      "*.tutanota.de",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: false,
      aliasSupport: true,
    },
    type: "privacy",
    reputation: "high",
  },

  mailru: {
    id: "mailru",
    name: "Mail.ru",
    domains: [
      "mail.ru",
      "inbox.ru",
      "list.ru",
      "bk.ru",
      "internet.ru",
    ],
    mxPatterns: [
      "mxs.mail.ru",
      "emx.mail.ru",
      "*.mail.ru",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: false,
    },
    type: "free",
    reputation: "medium",
  },

  qq: {
    id: "qq",
    name: "QQ Mail",
    domains: [
      "qq.com",
      "foxmail.com",
      "vip.qq.com",
    ],
    mxPatterns: [
      "mx*.qq.com",
      "*.qq.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: false,
      aliasSupport: false,
    },
    type: "free",
    reputation: "medium",
  },

  "163": {
    id: "163",
    name: "163 Mail",
    domains: [
      "163.com",
      "126.com",
      "yeah.net",
      "vip.163.com",
    ],
    mxPatterns: [
      "*.163.com",
      "mx*.163.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: false,
      aliasSupport: false,
    },
    type: "free",
    reputation: "medium",
  },

  // Workspace/Business providers (detected by MX)
  googleWorkspace: {
    id: "googleWorkspace",
    name: "Google Workspace",
    domains: [], // Custom domains only
    mxPatterns: [
      "aspmx.l.google.com",
      "*.aspmx.l.google.com",
      "alt*.aspmx.l.google.com",
      "*.google.com",
    ],
    features: {
      dotInsensitive: true,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "business",
    reputation: "high",
  },

  microsoft365: {
    id: "microsoft365",
    name: "Microsoft 365",
    domains: [], // Custom domains only
    mxPatterns: [
      "*.mail.protection.outlook.com",
      "*.onmicrosoft.com",
    ],
    features: {
      dotInsensitive: false,
      plusAddressing: true,
      aliasSupport: true,
    },
    type: "business",
    reputation: "high",
  },
};

/**
 * Domain to provider lookup map (built at load time)
 */
export const DOMAIN_TO_PROVIDER: Map<string, ProviderDefinition> = new Map();

// Build domain lookup
for (const provider of Object.values(PROVIDERS)) {
  for (const domain of provider.domains) {
    DOMAIN_TO_PROVIDER.set(domain.toLowerCase(), provider);
  }
}

/**
 * Get provider by domain (direct lookup)
 */
export function getProviderByDomain(domain: string): ProviderDefinition | undefined {
  return DOMAIN_TO_PROVIDER.get(domain.toLowerCase());
}

/**
 * Check if MX host matches a pattern (supports wildcards)
 */
export function matchesMxPattern(mxHost: string, pattern: string): boolean {
  const host = mxHost.toLowerCase();
  const pat = pattern.toLowerCase();

  if (pat.startsWith("*.")) {
    // Wildcard at start: *.example.com matches sub.example.com
    const suffix = pat.slice(1); // .example.com
    return host.endsWith(suffix) || host === pat.slice(2);
  }

  if (pat.includes("*")) {
    // Convert pattern to regex: alt*.aspmx.l.google.com -> alt.*\.aspmx\.l\.google\.com
    const regexStr = pat
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    const regex = new RegExp(`^${regexStr}$`, "i");
    return regex.test(host);
  }

  return host === pat;
}

/**
 * Get provider by MX hosts
 */
export function getProviderByMx(mxHosts: string[]): ProviderDefinition | undefined {
  if (!mxHosts || mxHosts.length === 0) return undefined;

  // Check each provider's MX patterns
  for (const provider of Object.values(PROVIDERS)) {
    for (const mxHost of mxHosts) {
      for (const pattern of provider.mxPatterns) {
        if (matchesMxPattern(mxHost, pattern)) {
          return provider;
        }
      }
    }
  }

  return undefined;
}
