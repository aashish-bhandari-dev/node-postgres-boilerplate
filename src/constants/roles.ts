import { UserRole } from '@prisma/client';
import { Permission, PermissionString } from './permissions';

/**
 * Role hierarchy levels.
 * Higher number indicates greater privilege.
 */
export const RoleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.MANAGER]: 50,
  [UserRole.USER]: 10,
} as const;

/**
 * Default permission matrix for each role.
 * Super Admin has the master wildcard '*' granting all operations.
 */
export const RolePermissions: Record<UserRole, readonly PermissionString[]> = {
  [UserRole.SUPER_ADMIN]: [Permission.ALL],

  [UserRole.ADMIN]: [
    Permission.USERS_MANAGE,
    Permission.ROLES_MANAGE,
    Permission.ROLES_READ,
    Permission.ROLES_ASSIGN,
    Permission.SETTINGS_MANAGE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.AUDIT_READ,
  ],

  [UserRole.MANAGER]: [
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.SETTINGS_READ,
    Permission.AUDIT_READ,
  ],

  [UserRole.USER]: [Permission.USERS_READ],
} as const;
