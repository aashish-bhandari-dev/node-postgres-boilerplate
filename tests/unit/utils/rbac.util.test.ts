import { describe, it, expect } from 'vitest';
import { UserRole } from '@prisma/client';
import { Permission } from '../../../src/constants/permissions';
import {
  matchesPermission,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleAtLeast,
  hasRole,
} from '../../../src/utils/rbac.util';

describe('RBAC Utility', () => {
  describe('matchesPermission', () => {
    it('should return true if granted permission is master wildcard * or *:*', () => {
      expect(matchesPermission('*', 'users:read')).toBe(true);
      expect(matchesPermission('*', 'anything:anyaction')).toBe(true);
      expect(matchesPermission('*:*', 'system:admin')).toBe(true);
    });

    it('should return true for exact permission matches', () => {
      expect(matchesPermission('users:read', 'users:read')).toBe(true);
      expect(matchesPermission('posts:create', 'posts:create')).toBe(true);
    });

    it('should return true if granted permission is a wildcard prefix like users:*', () => {
      expect(matchesPermission('users:*', 'users:read')).toBe(true);
      expect(matchesPermission('users:*', 'users:delete')).toBe(true);
      expect(matchesPermission('users:*', 'users:create')).toBe(true);
      expect(matchesPermission('users:*', 'other:read')).toBe(false);
    });

    it('should return false when permissions do not match', () => {
      expect(matchesPermission('users:read', 'users:delete')).toBe(false);
      expect(matchesPermission('roles:read', 'users:read')).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return empty array if user is null or missing role', () => {
      expect(getUserPermissions(null)).toEqual([]);
      expect(getUserPermissions(undefined)).toEqual([]);
      expect(getUserPermissions({})).toEqual([]);
    });

    it('should return predefined role permissions for SUPER_ADMIN', () => {
      const perms = getUserPermissions({ role: UserRole.SUPER_ADMIN });
      expect(perms).toContain(Permission.ALL);
    });

    it('should return predefined role permissions for ADMIN', () => {
      const perms = getUserPermissions({ role: UserRole.ADMIN });
      expect(perms).toContain(Permission.USERS_MANAGE);
      expect(perms).toContain(Permission.ROLES_MANAGE);
      expect(perms).toContain(Permission.SETTINGS_MANAGE);
    });

    it('should merge custom permissions from user.metadata.permissions', () => {
      const user = {
        role: UserRole.USER,
        metadata: {
          permissions: ['reports:view', 'custom:action'],
        },
      };

      const perms = getUserPermissions(user);
      expect(perms).toContain(Permission.USERS_READ);
      expect(perms).toContain('reports:view');
      expect(perms).toContain('custom:action');
    });

    it('should safely handle metadata when permissions is not an array', () => {
      const user = {
        role: UserRole.USER,
        metadata: {
          permissions: 'not-an-array',
        },
      };

      const perms = getUserPermissions(user);
      expect(perms).toEqual([Permission.USERS_READ]);
    });
  });

  describe('hasPermission', () => {
    it('should grant SUPER_ADMIN any permission', () => {
      const user = { role: UserRole.SUPER_ADMIN };
      expect(hasPermission(user, Permission.USERS_DELETE)).toBe(true);
      expect(hasPermission(user, 'any:random:permission')).toBe(true);
    });

    it('should grant ADMIN wildcard matched permissions like users:delete via users:*', () => {
      const user = { role: UserRole.ADMIN };
      expect(hasPermission(user, Permission.USERS_DELETE)).toBe(true);
      expect(hasPermission(user, Permission.USERS_READ)).toBe(true);
      expect(hasPermission(user, Permission.ROLES_MANAGE)).toBe(true);
    });

    it('should deny USER permissions they do not have', () => {
      const user = { role: UserRole.USER };
      expect(hasPermission(user, Permission.USERS_READ)).toBe(true);
      expect(hasPermission(user, Permission.USERS_DELETE)).toBe(false);
      expect(hasPermission(user, Permission.SETTINGS_MANAGE)).toBe(false);
    });

    it('should grant USER a permission when granted via metadata overrides', () => {
      const user = {
        role: UserRole.USER,
        metadata: { permissions: [Permission.USERS_DELETE] },
      };
      expect(hasPermission(user, Permission.USERS_DELETE)).toBe(true);
    });

    it('should return false for null user', () => {
      expect(hasPermission(null, Permission.USERS_READ)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user matches at least one permission', () => {
      const user = { role: UserRole.USER };
      expect(
        hasAnyPermission(user, [Permission.USERS_DELETE, Permission.USERS_READ]),
      ).toBe(true);
    });

    it('should return false if user matches none of the permissions', () => {
      const user = { role: UserRole.USER };
      expect(
        hasAnyPermission(user, [Permission.USERS_DELETE, Permission.ROLES_MANAGE]),
      ).toBe(false);
    });

    it('should return true if requested list is empty', () => {
      const user = { role: UserRole.USER };
      expect(hasAnyPermission(user, [])).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user matches all required permissions', () => {
      const admin = { role: UserRole.ADMIN };
      expect(
        hasAllPermissions(admin, [
          Permission.USERS_READ,
          Permission.USERS_DELETE,
          Permission.ROLES_MANAGE,
        ]),
      ).toBe(true);
    });

    it('should return false if user is missing any required permission', () => {
      const manager = { role: UserRole.MANAGER };
      expect(
        hasAllPermissions(manager, [
          Permission.USERS_READ,
          Permission.ROLES_MANAGE, // Manager lacks this
        ]),
      ).toBe(false);
    });

    it('should return true if requested list is empty', () => {
      const user = { role: UserRole.USER };
      expect(hasAllPermissions(user, [])).toBe(true);
    });
  });

  describe('Role Hierarchy & hasRole', () => {
    it('should correctly evaluate role hierarchy levels', () => {
      expect(isRoleAtLeast(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
      expect(isRoleAtLeast(UserRole.ADMIN, UserRole.MANAGER)).toBe(true);
      expect(isRoleAtLeast(UserRole.MANAGER, UserRole.USER)).toBe(true);
      expect(isRoleAtLeast(UserRole.USER, UserRole.MANAGER)).toBe(false);
      expect(isRoleAtLeast(UserRole.USER, UserRole.ADMIN)).toBe(false);
    });

    it('should allow higher roles by default with hasRole', () => {
      const admin = { role: UserRole.ADMIN };
      expect(hasRole(admin, UserRole.MANAGER)).toBe(true);
      expect(hasRole(admin, UserRole.USER)).toBe(true);
      expect(hasRole(admin, UserRole.ADMIN)).toBe(true);
      expect(hasRole(admin, UserRole.SUPER_ADMIN)).toBe(false);
    });

    it('should enforce exact role when allowHigher is false', () => {
      const admin = { role: UserRole.ADMIN };
      expect(hasRole(admin, UserRole.MANAGER, { allowHigher: false })).toBe(false);
      expect(hasRole(admin, UserRole.ADMIN, { allowHigher: false })).toBe(true);
    });

    it('should return false for null user', () => {
      expect(hasRole(null, UserRole.USER)).toBe(false);
    });
  });
});
