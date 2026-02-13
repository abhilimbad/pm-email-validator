/**
 * Common email domains for typo detection.
 * Used to suggest corrections for misspelled domain names.
 */

/**
 * List of popular email domains for typo suggestion.
 * Sorted roughly by popularity/usage.
 */
export const COMMON_EMAIL_DOMAINS: string[] = [
  // Major providers
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",

  // Microsoft variants
  "live.com",
  "msn.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.it",
  "hotmail.es",
  "outlook.co.uk",
  "outlook.fr",
  "outlook.de",
  "live.co.uk",
  "live.fr",
  "live.de",

  // Yahoo variants
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

  // Apple
  "me.com",
  "mac.com",

  // Privacy-focused
  "pm.me",
  "protonmail.ch",
  "tutanota.com",
  "tutanota.de",
  "tuta.io",
  "fastmail.com",
  "fastmail.fm",

  // European providers
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "gmx.at",
  "gmx.ch",
  "web.de",
  "t-online.de",
  "freenet.de",
  "orange.fr",
  "wanadoo.fr",
  "laposte.net",
  "free.fr",
  "sfr.fr",
  "libero.it",
  "virgilio.it",
  "alice.it",
  "tin.it",
  "bluewin.ch",

  // Asian providers
  "qq.com",
  "163.com",
  "126.com",
  "yeah.net",
  "sina.com",
  "sohu.com",
  "foxmail.com",
  "naver.com",
  "daum.net",
  "hanmail.net",

  // Russian providers
  "yandex.com",
  "yandex.ru",
  "ya.ru",
  "mail.ru",
  "inbox.ru",
  "list.ru",
  "bk.ru",

  // Regional variants
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "bellsouth.net",
  "charter.net",
  "cox.net",
  "earthlink.net",
  "juno.com",
  "netzero.net",

  // Business/Professional
  "zoho.com",
  "zohomail.com",
  "mailbox.org",

  // UK providers
  "btinternet.com",
  "btopenworld.com",
  "talktalk.net",
  "sky.com",
  "virginmedia.com",
  "ntlworld.com",

  // Australian providers
  "bigpond.com",
  "bigpond.net.au",
  "optusnet.com.au",
  "iinet.net.au",
  "internode.on.net",

  // Canadian providers
  "rogers.com",
  "shaw.ca",
  "telus.net",
  "sympatico.ca",

  // Educational (common patterns)
  "edu",
  "ac.uk",
  "edu.au",

  // Other popular domains
  "aim.com",
  "aol.co.uk",
  "aol.de",
  "aol.fr",
  "email.com",
  "usa.com",
  "post.com",
  "myself.com",
  "consultant.com",
  "europe.com",
  "asia.com",
  "writeme.com",
  "dr.com",
  "engineer.com",
  "cheerful.com",
  "techie.com",
  "workmail.com",
  "inbox.com",

  // Less common but valid
  "rediffmail.com",
  "lycos.com",
  "excite.com",
  "hushmail.com",
  "runbox.com",
  "lavabit.com",
  "safe-mail.net",
  "countermail.com",
  "mailfence.com",
  "disroot.org",
  "posteo.de",
  "mailbox.org",
  "kolabnow.com",
  "startmail.com",
  "ctemplar.com",
  "cock.li",
  "airmail.cc",

  // Indian providers
  "rediffmail.com",
  "sify.com",
  "in.com",

  // Brazilian providers
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "ig.com.br",
  "globo.com",

  // Spanish providers
  "telefonica.net",
  "terra.es",
  "ya.com",

  // Other international
  "mail.de",
  "arcor.de",
  "email.de",
  "online.de",
  "netscape.net",
  "excite.co.jp",
  "goo.jp",
  "biglobe.ne.jp",
  "nifty.com",
  "infoseek.jp",
  "ocn.ne.jp",
  "plala.or.jp",
  "dti.ne.jp",
  "sannet.ne.jp",
  "hi-ho.ne.jp",

];

/**
 * Set version for O(1) lookup when checking valid domains
 */
export const COMMON_EMAIL_DOMAINS_SET: Set<string> = new Set(COMMON_EMAIL_DOMAINS);

/**
 * Primary domains to suggest (the most popular ones).
 * Used when we detect a typo and want to provide the most likely correction.
 */
export const PRIMARY_DOMAINS: string[] = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "live.com",
  "mail.com",
  "msn.com",
  "ymail.com",
  "me.com",
  "mac.com",
  "gmx.com",
  "zoho.com",
  "fastmail.com",
  "tutanota.com",
  "pm.me",
  "mail.ru",
  "yandex.com",
  "qq.com",
  "163.com",
  "comcast.net",
  "verizon.net",
  "att.net",
];

/**
 * Domain aliases - when someone types one, they might mean the other
 */
export const DOMAIN_ALIASES: Record<string, string> = {
  "googlemail.com": "gmail.com",
  "ymail.com": "yahoo.com",
  "rocketmail.com": "yahoo.com",
  "pm.me": "protonmail.com",
  "protonmail.ch": "protonmail.com",
  "proton.me": "protonmail.com",
  "tuta.io": "tutanota.com",
  "tutanota.de": "tutanota.com",
  "me.com": "icloud.com",
  "mac.com": "icloud.com",
  "live.com": "outlook.com",
  "msn.com": "outlook.com",
  "hotmail.com": "outlook.com",
  "fastmail.fm": "fastmail.com",
};

/**
 * Get the count of common domains in the list.
 */
export function getTypoDomainsCount(): number {
  return COMMON_EMAIL_DOMAINS.length;
}
