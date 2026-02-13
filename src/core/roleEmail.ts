/**
 * Role email detection module.
 * Identifies addresses that go to groups/functions rather than individuals.
 */

import {
  RoleCategory,
  RoleEmailDefinition,
  ROLE_PREFIX_SET,
  ROLE_PREFIX_MAP,
} from "../data/roleEmails.js";

export interface RoleEmailResult {
  /** Whether the email is a role-based address */
  isRole: boolean;
  /** The role prefix if detected */
  prefix?: string;
  /** Category of the role */
  category?: RoleCategory;
  /** Whether this role is commonly abused by spammers */
  commonlyAbused?: boolean;
}

/**
 * Extract the local part (before @) from an email.
 */
function extractLocalPart(email: string): string | null {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return null;
  return email.slice(0, atIndex);
}

/**
 * Check if an email address is a role-based address.
 *
 * Role addresses are typically:
 * - info@, admin@, support@ (generic mailboxes)
 * - noreply@, no-reply@ (automated senders)
 * - postmaster@, webmaster@ (technical roles)
 *
 * @param email - The email address or local part to check
 * @returns Role email detection result
 */
export function isRoleEmail(email: string): RoleEmailResult {
  // Handle both full email and just local part
  const localPart = email.includes("@") ? extractLocalPart(email) : email;

  if (!localPart) {
    return { isRole: false };
  }

  const normalized = localPart.toLowerCase();

  // Check exact match first
  if (ROLE_PREFIX_SET.has(normalized)) {
    const def = ROLE_PREFIX_MAP.get(normalized)!;
    return {
      isRole: true,
      prefix: def.prefix,
      category: def.category,
      commonlyAbused: def.commonlyAbused,
    };
  }

  // Check if local part starts with a role prefix followed by numbers
  // e.g., "admin1", "support2", "info123"
  for (const def of ROLE_PREFIX_MAP.values()) {
    const prefix = def.prefix;
    if (normalized.startsWith(prefix)) {
      const suffix = normalized.slice(prefix.length);
      // Must be followed by only digits or nothing
      if (/^\d*$/.test(suffix)) {
        return {
          isRole: true,
          prefix: def.prefix,
          category: def.category,
          commonlyAbused: def.commonlyAbused,
        };
      }
    }
  }

  return { isRole: false };
}

/**
 * Get detailed information about a role email.
 *
 * @param email - The email address to check
 * @returns Full role definition or undefined
 */
export function getRoleEmailInfo(email: string): RoleEmailDefinition | undefined {
  const result = isRoleEmail(email);
  if (!result.isRole || !result.prefix) {
    return undefined;
  }
  return ROLE_PREFIX_MAP.get(result.prefix.toLowerCase());
}

/**
 * Check if the role email is a no-reply address.
 *
 * @param email - The email address to check
 * @returns true if it's a no-reply type address
 */
export function isNoReplyEmail(email: string): boolean {
  const result = isRoleEmail(email);
  return result.isRole && result.category === "noreply";
}

/**
 * Check if the role email is commonly abused by spammers.
 *
 * @param email - The email address to check
 * @returns true if commonly abused
 */
export function isCommonlyAbusedRole(email: string): boolean {
  const result = isRoleEmail(email);
  return result.isRole && result.commonlyAbused === true;
}
