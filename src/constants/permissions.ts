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
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
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

export interface PermissionDefinition {
  name: string;
  displayName: string;
  description: string;
  module: string;
  action: string;
}

/**
 * Predefined catalog of permissions with metadata for seeding and frontend display.
 */
export const SYSTEM_PERMISSIONS: readonly PermissionDefinition[] = [
  {
    name: Permission.ALL,
    displayName: 'All Permissions (Super Admin)',
    description: 'Full super-admin access across all resources and operations',
    module: 'system',
    action: 'all',
  },
  {
    name: Permission.USERS_MANAGE,
    displayName: 'Manage All Users',
    description: 'Full administrative access to manage all users',
    module: 'users',
    action: 'manage',
  },
  {
    name: Permission.USERS_READ,
    displayName: 'View Users',
    description: 'View user accounts, profiles, and listing',
    module: 'users',
    action: 'read',
  },
  {
    name: Permission.USERS_CREATE,
    displayName: 'Create Users',
    description: 'Create new user accounts',
    module: 'users',
    action: 'create',
  },
  {
    name: Permission.USERS_UPDATE,
    displayName: 'Update Users',
    description: 'Edit existing user accounts and profiles',
    module: 'users',
    action: 'update',
  },
  {
    name: Permission.USERS_DELETE,
    displayName: 'Delete Users',
    description: 'Permanently delete or soft-delete user accounts',
    module: 'users',
    action: 'delete',
  },
  {
    name: Permission.ROLES_MANAGE,
    displayName: 'Manage All Roles',
    description: 'Full control over role definitions and permissions',
    module: 'roles',
    action: 'manage',
  },
  {
    name: Permission.ROLES_READ,
    displayName: 'View Roles & Permissions',
    description: 'List roles and inspect assigned permissions',
    module: 'roles',
    action: 'read',
  },
  {
    name: Permission.ROLES_CREATE,
    displayName: 'Create Roles',
    description: 'Create new custom roles in the system',
    module: 'roles',
    action: 'create',
  },
  {
    name: Permission.ROLES_UPDATE,
    displayName: 'Update Roles',
    description: 'Modify role details and assigned permissions',
    module: 'roles',
    action: 'update',
  },
  {
    name: Permission.ROLES_DELETE,
    displayName: 'Delete Roles',
    description: 'Delete custom roles',
    module: 'roles',
    action: 'delete',
  },
  {
    name: Permission.ROLES_ASSIGN,
    displayName: 'Assign Roles & Permissions',
    description: 'Assign or modify roles and custom permissions for users',
    module: 'roles',
    action: 'assign',
  },
  {
    name: Permission.SETTINGS_MANAGE,
    displayName: 'Manage All Settings',
    description: 'Full control over system settings',
    module: 'settings',
    action: 'manage',
  },
  {
    name: Permission.SETTINGS_READ,
    displayName: 'View Settings',
    description: 'View system configuration and preferences',
    module: 'settings',
    action: 'read',
  },
  {
    name: Permission.SETTINGS_UPDATE,
    displayName: 'Update Settings',
    description: 'Modify system configuration and preferences',
    module: 'settings',
    action: 'update',
  },
  {
    name: Permission.AUDIT_READ,
    displayName: 'View Audit Logs',
    description: 'Inspect system activity and audit logs',
    module: 'audit',
    action: 'read',
  },
] as const;
