/**
 * Role-based email prefixes.
 * These are addresses that typically go to a group/function rather than an individual.
 */

/**
 * Role email categories
 */
export type RoleCategory =
  | "generic"      // General contact points
  | "support"      // Customer support
  | "sales"        // Sales and business development
  | "technical"    // Technical/IT
  | "security"     // Security and abuse
  | "legal"        // Legal and compliance
  | "hr"           // Human resources
  | "marketing"    // Marketing and PR
  | "billing"      // Billing and finance
  | "noreply"      // Automated/no-reply addresses
  | "system";      // System-generated

export interface RoleEmailDefinition {
  /** The prefix (e.g., "info", "admin") */
  prefix: string;
  /** Category of role email */
  category: RoleCategory;
  /** Whether this is commonly used by spammers for abuse */
  commonlyAbused?: boolean;
}

/**
 * Comprehensive list of role-based email prefixes
 */
export const ROLE_EMAIL_PREFIXES: RoleEmailDefinition[] = [
  // Generic contact points
  { prefix: "info", category: "generic" },
  { prefix: "contact", category: "generic" },
  { prefix: "hello", category: "generic" },
  { prefix: "hi", category: "generic" },
  { prefix: "office", category: "generic" },
  { prefix: "mail", category: "generic" },
  { prefix: "email", category: "generic" },
  { prefix: "inbox", category: "generic" },
  { prefix: "enquiry", category: "generic" },
  { prefix: "enquiries", category: "generic" },
  { prefix: "inquiry", category: "generic" },
  { prefix: "inquiries", category: "generic" },
  { prefix: "general", category: "generic" },
  { prefix: "team", category: "generic" },
  { prefix: "all", category: "generic" },
  { prefix: "company", category: "generic" },
  { prefix: "business", category: "generic" },

  // Support
  { prefix: "support", category: "support" },
  { prefix: "help", category: "support" },
  { prefix: "helpdesk", category: "support" },
  { prefix: "customerservice", category: "support" },
  { prefix: "customer-service", category: "support" },
  { prefix: "customercare", category: "support" },
  { prefix: "customer-care", category: "support" },
  { prefix: "service", category: "support" },
  { prefix: "care", category: "support" },
  { prefix: "feedback", category: "support" },
  { prefix: "complaints", category: "support" },
  { prefix: "assist", category: "support" },
  { prefix: "assistance", category: "support" },

  // Sales
  { prefix: "sales", category: "sales" },
  { prefix: "sell", category: "sales" },
  { prefix: "buy", category: "sales" },
  { prefix: "order", category: "sales" },
  { prefix: "orders", category: "sales" },
  { prefix: "shop", category: "sales" },
  { prefix: "store", category: "sales" },
  { prefix: "purchase", category: "sales" },
  { prefix: "purchasing", category: "sales" },
  { prefix: "quote", category: "sales" },
  { prefix: "quotes", category: "sales" },
  { prefix: "pricing", category: "sales" },
  { prefix: "deals", category: "sales" },
  { prefix: "partners", category: "sales" },
  { prefix: "partnership", category: "sales" },
  { prefix: "partnerships", category: "sales" },
  { prefix: "bizdev", category: "sales" },
  { prefix: "bd", category: "sales" },

  // Technical
  { prefix: "admin", category: "technical", commonlyAbused: true },
  { prefix: "administrator", category: "technical" },
  { prefix: "sysadmin", category: "technical" },
  { prefix: "tech", category: "technical" },
  { prefix: "technical", category: "technical" },
  { prefix: "it", category: "technical" },
  { prefix: "itsupport", category: "technical" },
  { prefix: "it-support", category: "technical" },
  { prefix: "webmaster", category: "technical" },
  { prefix: "hostmaster", category: "technical" },
  { prefix: "postmaster", category: "technical", commonlyAbused: true },
  { prefix: "root", category: "technical", commonlyAbused: true },
  { prefix: "www", category: "technical" },
  { prefix: "web", category: "technical" },
  { prefix: "dev", category: "technical" },
  { prefix: "developer", category: "technical" },
  { prefix: "developers", category: "technical" },
  { prefix: "devops", category: "technical" },
  { prefix: "ops", category: "technical" },
  { prefix: "engineering", category: "technical" },
  { prefix: "engineer", category: "technical" },
  { prefix: "api", category: "technical" },

  // Security
  { prefix: "security", category: "security" },
  { prefix: "secure", category: "security" },
  { prefix: "abuse", category: "security", commonlyAbused: true },
  { prefix: "spam", category: "security" },
  { prefix: "phishing", category: "security" },
  { prefix: "fraud", category: "security" },
  { prefix: "cert", category: "security" },
  { prefix: "csirt", category: "security" },
  { prefix: "incident", category: "security" },
  { prefix: "incidents", category: "security" },
  { prefix: "vulnerability", category: "security" },
  { prefix: "disclosure", category: "security" },

  // Legal
  { prefix: "legal", category: "legal" },
  { prefix: "compliance", category: "legal" },
  { prefix: "privacy", category: "legal" },
  { prefix: "gdpr", category: "legal" },
  { prefix: "dmca", category: "legal" },
  { prefix: "copyright", category: "legal" },
  { prefix: "trademark", category: "legal" },
  { prefix: "ip", category: "legal" },

  // HR
  { prefix: "hr", category: "hr" },
  { prefix: "humanresources", category: "hr" },
  { prefix: "human-resources", category: "hr" },
  { prefix: "jobs", category: "hr" },
  { prefix: "careers", category: "hr" },
  { prefix: "career", category: "hr" },
  { prefix: "recruiting", category: "hr" },
  { prefix: "recruitment", category: "hr" },
  { prefix: "talent", category: "hr" },
  { prefix: "hiring", category: "hr" },
  { prefix: "people", category: "hr" },
  { prefix: "employee", category: "hr" },
  { prefix: "employees", category: "hr" },

  // Marketing
  { prefix: "marketing", category: "marketing" },
  { prefix: "pr", category: "marketing" },
  { prefix: "press", category: "marketing" },
  { prefix: "media", category: "marketing" },
  { prefix: "news", category: "marketing" },
  { prefix: "newsletter", category: "marketing" },
  { prefix: "promotions", category: "marketing" },
  { prefix: "promo", category: "marketing" },
  { prefix: "advertising", category: "marketing" },
  { prefix: "ads", category: "marketing" },
  { prefix: "social", category: "marketing" },
  { prefix: "brand", category: "marketing" },
  { prefix: "events", category: "marketing" },
  { prefix: "event", category: "marketing" },
  { prefix: "communications", category: "marketing" },
  { prefix: "comms", category: "marketing" },

  // Billing
  { prefix: "billing", category: "billing" },
  { prefix: "invoices", category: "billing" },
  { prefix: "invoice", category: "billing" },
  { prefix: "invoicing", category: "billing" },
  { prefix: "accounts", category: "billing" },
  { prefix: "accounting", category: "billing" },
  { prefix: "finance", category: "billing" },
  { prefix: "payments", category: "billing" },
  { prefix: "payment", category: "billing" },
  { prefix: "pay", category: "billing" },
  { prefix: "receivables", category: "billing" },
  { prefix: "payables", category: "billing" },
  { prefix: "ar", category: "billing" },
  { prefix: "ap", category: "billing" },

  // No-reply / Automated
  { prefix: "noreply", category: "noreply" },
  { prefix: "no-reply", category: "noreply" },
  { prefix: "no_reply", category: "noreply" },
  { prefix: "donotreply", category: "noreply" },
  { prefix: "do-not-reply", category: "noreply" },
  { prefix: "do_not_reply", category: "noreply" },
  { prefix: "mailer", category: "noreply" },
  { prefix: "mailer-daemon", category: "noreply" },
  { prefix: "daemon", category: "noreply" },
  { prefix: "bounce", category: "noreply" },
  { prefix: "bounces", category: "noreply" },
  { prefix: "auto", category: "noreply" },
  { prefix: "automated", category: "noreply" },
  { prefix: "autoresponder", category: "noreply" },
  { prefix: "notification", category: "noreply" },
  { prefix: "notifications", category: "noreply" },
  { prefix: "notify", category: "noreply" },
  { prefix: "alert", category: "noreply" },
  { prefix: "alerts", category: "noreply" },
  { prefix: "system", category: "noreply" },
  { prefix: "robot", category: "noreply" },
  { prefix: "bot", category: "noreply" },

  // System
  { prefix: "ftp", category: "system" },
  { prefix: "mail", category: "system" },
  { prefix: "smtp", category: "system" },
  { prefix: "imap", category: "system" },
  { prefix: "pop", category: "system" },
  { prefix: "pop3", category: "system" },
  { prefix: "test", category: "system", commonlyAbused: true },
  { prefix: "testing", category: "system" },
  { prefix: "debug", category: "system" },
  { prefix: "null", category: "system" },
  { prefix: "void", category: "system" },
  { prefix: "nobody", category: "system" },
  { prefix: "anonymous", category: "system" },
  { prefix: "guest", category: "system" },
  { prefix: "user", category: "system" },
  { prefix: "username", category: "system" },
];

/**
 * Quick lookup set of role prefixes (lowercase)
 */
export const ROLE_PREFIX_SET: Set<string> = new Set(
  ROLE_EMAIL_PREFIXES.map((r) => r.prefix.toLowerCase())
);

/**
 * Map of prefix to definition for detailed info
 */
export const ROLE_PREFIX_MAP: Map<string, RoleEmailDefinition> = new Map(
  ROLE_EMAIL_PREFIXES.map((r) => [r.prefix.toLowerCase(), r])
);
