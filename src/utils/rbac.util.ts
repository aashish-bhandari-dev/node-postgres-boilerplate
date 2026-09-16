import { PermissionString } from '../constants/permissions';
import { RoleHierarchy, RolePermissions, UserRole } from '../constants/roles';

export interface UserPermissionRecord {
  isGranted: boolean;
  permission?: { name: string } | null;
  permissionName?: string;
}

export interface UserAuthContext {
  id?: string;
  role?: UserRole | string | { id?: string; name: string; displayName?: string; hierarchy?: number; isSystem?: boolean } | null;
  roleName?: string;
  roleId?: string;
  roleHierarchy?: number;
  rolePermissions?: string[];
  hasCustomPermissions?: boolean;
  userPermissions?: UserPermissionRecord[];
  permissions?: string[];
  deniedPermissions?: string[];
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
 * Extracts explicit denied permissions for a user from their custom permissions or metadata.
 */
export function getDeniedPermissions(user?: UserAuthContext | null): Set<string> {
  const denied = new Set<string>();
  if (!user) return denied;

  // 1. Direct denied permissions from UserPermission records
  if (user.userPermissions && Array.isArray(user.userPermissions)) {
    for (const record of user.userPermissions) {
      if (record.isGranted === false) {
        const name = record.permission?.name || record.permissionName;
        if (name) denied.add(name);
      }
    }
  }

  // 2. Denied permissions from deniedPermissions array on context
  if (user.deniedPermissions && Array.isArray(user.deniedPermissions)) {
    for (const p of user.deniedPermissions) {
      if (typeof p === 'string') denied.add(p);
    }
  }

  // 3. Denied permissions stored in user metadata (for backward compatibility)
  if (
    user.metadata &&
    typeof user.metadata === 'object' &&
    'deniedPermissions' in user.metadata &&
    Array.isArray((user.metadata as { deniedPermissions?: unknown }).deniedPermissions)
  ) {
    const customDenied = (user.metadata as { deniedPermissions: unknown[] })
      .deniedPermissions;
    for (const p of customDenied) {
      if (typeof p === 'string') denied.add(p);
    }
  }

  return denied;
}

/**
 * Extracts and consolidates all effective permissions for a user.
 * Combines role-based permissions with custom grants and explicit denies.
 */
export function getUserPermissions(user?: UserAuthContext | null): string[] {
  if (!user || !user.role) {
    return [];
  }

  // If user already has resolved permissions array attached, return it directly (fast path)
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions;
  }

  const permissions = new Set<string>();
  const denied = getDeniedPermissions(user);

  // 1. Role-based default or dynamic permissions
  const role = typeof user.role === 'object' && user.role !== null ? user.role.name : (user.role as string);
  const rolePerms = user.rolePermissions ?? RolePermissions[role];
  if (rolePerms && Array.isArray(rolePerms)) {
    for (const p of rolePerms) {
      // Only add if not explicitly denied
      if (!denied.has(p)) {
        permissions.add(p);
      }
    }
  }

  // 2. Custom per-user direct permissions from UserPermission records
  if (user.userPermissions && Array.isArray(user.userPermissions)) {
    for (const record of user.userPermissions) {
      const name = record.permission?.name || record.permissionName;
      if (name) {
        if (record.isGranted) {
          permissions.add(name);
        } else {
          permissions.delete(name);
        }
      }
    }
  }

  // 3. Custom per-user override permissions (stored in metadata.permissions)
  if (
    user.metadata &&
    typeof user.metadata === 'object' &&
    'permissions' in user.metadata &&
    Array.isArray((user.metadata as { permissions?: unknown }).permissions)
  ) {
    const customPerms = (user.metadata as { permissions: unknown[] }).permissions;
    for (const p of customPerms) {
      if (typeof p === 'string' && !denied.has(p)) {
        permissions.add(p);
      }
    }
  }

  return Array.from(permissions);
}

/**
 * Checks if a user has a specific permission (or wildcard granting it).
 * Enforces: Explicit Deny ALWAYS takes precedence over wildcard or role grants!
 */
export function hasPermission(
  user: UserAuthContext | null | undefined,
  requiredPermission: PermissionString,
): boolean {
  if (!user) return false;

  // 1. Check if user is explicitly denied this permission
  const denied = getDeniedPermissions(user);
  if (denied.has(requiredPermission)) {
    return false;
  }

  // 2. Check effective permissions
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
  targetRole: UserRole | string,
  options?: { currentHierarchy?: number; targetHierarchy?: number },
): boolean {
  const currentWeight = options?.currentHierarchy ?? RoleHierarchy[currentRole] ?? 0;
  const targetWeight = options?.targetHierarchy ?? RoleHierarchy[targetRole] ?? 0;
  return currentWeight >= targetWeight;
}

/**
 * Checks if user has a role, with optional role hierarchy support (default true).
 */
export function hasRole(
  user: UserAuthContext | null | undefined,
  targetRole: UserRole | string,
  options: { allowHigher?: boolean } = {},
): boolean {
  if (!user || !user.role) return false;
  const { allowHigher = true } = options;
  const currentRole = typeof user.role === 'object' && user.role !== null ? user.role.name : (user.role as string);

  if (allowHigher) {
    return isRoleAtLeast(currentRole, targetRole, {
      currentHierarchy: user.roleHierarchy,
    });
  }

  return currentRole === targetRole;
}

/**
 * Checks if a user has any of the specified roles.
 */
export function hasAnyRole(
  user: UserAuthContext | null | undefined,
  roles: (UserRole | string)[],
  options: { allowHigher?: boolean } = {},
): boolean {
  if (!user || !user.role) return false;
  return roles.some((role) => hasRole(user, role, options));
}

/**
 * Spatie Laravel-style alias for hasPermission.
 * e.g. hasPermissionTo(user, 'users:update')
 */
export const hasPermissionTo = hasPermission;

/**
 * Spatie/Gate-style alias for hasPermission.
 * e.g. canDo(user, 'users:update')
 */
export const canDo = hasPermission;
