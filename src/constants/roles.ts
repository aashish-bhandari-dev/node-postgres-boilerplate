import { Permission, PermissionString } from './permissions';

/**
 * Standard system roles.
 */
export const DefaultRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
} as const;

export const UserRole = DefaultRoles;
export type UserRole = (typeof DefaultRoles)[keyof typeof DefaultRoles] | (string & {});

/**
 * Role hierarchy levels for standard roles.
 * Higher number indicates greater privilege.
 */
export const RoleHierarchy: Record<string, number> = {
  [DefaultRoles.SUPER_ADMIN]: 100,
  [DefaultRoles.ADMIN]: 80,
  [DefaultRoles.MANAGER]: 50,
  [DefaultRoles.USER]: 10,
};

/**
 * Default permission matrix for standard system roles.
 * Super Admin has the master wildcard '*' granting all operations.
 */
export const RolePermissions: Record<string, readonly PermissionString[]> = {
  [DefaultRoles.SUPER_ADMIN]: [Permission.ALL],

  [DefaultRoles.ADMIN]: [
    Permission.USERS_MANAGE,
    Permission.ROLES_MANAGE,
    Permission.ROLES_READ,
    Permission.ROLES_CREATE,
    Permission.ROLES_UPDATE,
    Permission.ROLES_DELETE,
    Permission.ROLES_ASSIGN,
    Permission.SETTINGS_MANAGE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.AUDIT_READ,
  ],

  [DefaultRoles.MANAGER]: [
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.SETTINGS_READ,
    Permission.AUDIT_READ,
  ],

  [DefaultRoles.USER]: [Permission.USERS_READ],
};
