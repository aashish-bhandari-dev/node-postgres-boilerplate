/**
 * Granular system permissions.
 *
 * Convention:
 * - resource:*      -> full access to the resource
 * - resource:action -> specific action on the resource
 * - *               -> super-admin / god-mode access
 */
export const Permission = {
  /**
   * Super wildcard: grants access to every action and resource in the application
   */
  ALL: '*',

  // --- Users & Account Management ---
  USERS_MANAGE: 'users:*',
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // --- Roles & Access Management ---
  ROLES_MANAGE: 'roles:*',
  ROLES_READ: 'roles:read',
  ROLES_ASSIGN: 'roles:assign',

  // --- System & Application Settings ---
  SETTINGS_MANAGE: 'settings:*',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',

  // --- Audit & Logs ---
  AUDIT_READ: 'audit:read',
} as const;

/**
 * Known compile-time permission union.
 */
export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Flexible permission type that autocompletes predefined permissions
 * while also allowing any custom string (e.g. for dynamic plugins or future models).
 */
export type PermissionString = Permission | (string & {});
