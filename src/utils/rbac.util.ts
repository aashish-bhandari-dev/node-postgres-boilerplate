import { UserRole } from '@prisma/client';
import { PermissionString } from '../constants/permissions';
import { RoleHierarchy, RolePermissions } from '../constants/roles';

export interface UserAuthContext {
  role?: UserRole | string;
  metadata?: unknown;
  [key: string]: unknown;
}

/**
 * Checks whether a granted permission satisfies the required permission.
 * Supports wildcards:
 * - '*' matches anything
 * - 'resource:*' matches 'resource:action' (e.g. 'users:*' matches 'users:read')
 */
export function matchesPermission(
  grantedPermission: string,
  requiredPermission: string,
): boolean {
  if (grantedPermission === '*' || grantedPermission === '*:*') {
    return true;
  }

  if (grantedPermission === requiredPermission) {
    return true;
  }

  if (grantedPermission.endsWith(':*')) {
    const prefix = grantedPermission.slice(0, -1); // e.g. "users:"
    return requiredPermission.startsWith(prefix);
  }

  return false;
}

/**
 * Extracts and consolidates all effective permissions for a user.
 * Combines role-based permissions with any custom overrides stored in user metadata.
 */
export function getUserPermissions(user?: UserAuthContext | null): string[] {
  if (!user || !user.role) {
    return [];
  }

  const permissions = new Set<string>();

  // 1. Role-based default permissions
  const role = user.role as UserRole;
  const rolePerms = RolePermissions[role];
  if (rolePerms && Array.isArray(rolePerms)) {
    for (const p of rolePerms) {
      permissions.add(p);
    }
  }

  // 2. Custom per-user override permissions (stored in metadata.permissions)
  if (
    user.metadata &&
    typeof user.metadata === 'object' &&
    'permissions' in user.metadata &&
    Array.isArray((user.metadata as { permissions?: unknown }).permissions)
  ) {
    const customPerms = (user.metadata as { permissions: unknown[] }).permissions;
    for (const p of customPerms) {
      if (typeof p === 'string') {
        permissions.add(p);
      }
    }
  }

  return Array.from(permissions);
}

/**
 * Checks if a user has a specific permission (or wildcard granting it).
 */
export function hasPermission(
  user: UserAuthContext | null | undefined,
  requiredPermission: PermissionString,
): boolean {
  if (!user) return false;
  const userPermissions = getUserPermissions(user);
  return userPermissions.some((granted) =>
    matchesPermission(granted, requiredPermission),
  );
}

/**
 * Checks if a user has ANY of the specified permissions.
 */
export function hasAnyPermission(
  user: UserAuthContext | null | undefined,
  requiredPermissions: PermissionString[],
): boolean {
  if (!user) return false;
  if (!requiredPermissions.length) return true;
  const userPermissions = getUserPermissions(user);
  return requiredPermissions.some((required) =>
    userPermissions.some((granted) => matchesPermission(granted, required)),
  );
}

/**
 * Checks if a user has ALL of the specified permissions.
 */
export function hasAllPermissions(
  user: UserAuthContext | null | undefined,
  requiredPermissions: PermissionString[],
): boolean {
  if (!user) return false;
  if (!requiredPermissions.length) return true;
  const userPermissions = getUserPermissions(user);
  return requiredPermissions.every((required) =>
    userPermissions.some((granted) => matchesPermission(granted, required)),
  );
}

/**
 * Checks whether user's role meets or exceeds a target role in the hierarchy.
 */
export function isRoleAtLeast(
  currentRole: UserRole | string,
  targetRole: UserRole,
): boolean {
  const currentWeight = RoleHierarchy[currentRole as UserRole] ?? 0;
  const targetWeight = RoleHierarchy[targetRole] ?? 0;
  return currentWeight >= targetWeight;
}

/**
 * Checks if user has a role, with optional role hierarchy support (default true).
 */
export function hasRole(
  user: UserAuthContext | null | undefined,
  targetRole: UserRole,
  options: { allowHigher?: boolean } = {},
): boolean {
  if (!user || !user.role) return false;
  const { allowHigher = true } = options;

  if (allowHigher) {
    return isRoleAtLeast(user.role, targetRole);
  }

  return user.role === targetRole;
}
