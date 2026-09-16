import { describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '../../../src/constants/roles';
import { PolicyRegistry } from '../../../src/core/policy/policy.registry';
import { can } from '../../../src/core/policy/policy.engine';
import { registerUserPolicy } from '../../../src/core/policy/policies/user.policy';

describe('RBAC + ABAC User Policy Synergy', () => {
  beforeEach(() => {
    PolicyRegistry.clear();
    registerUserPolicy();
  });

  const superAdmin = {
    id: 'super-admin-1',
    role: UserRole.SUPER_ADMIN,
    permissions: ['*'],
  };

  const admin1 = {
    id: 'admin-1',
    role: UserRole.ADMIN,
    hasCustomPermissions: false,
    userPermissions: [],
  };

  const admin2Restricted = {
    id: 'admin-2',
    role: UserRole.ADMIN,
    hasCustomPermissions: true,
    userPermissions: [
      {
        isGranted: false,
        permission: { name: 'users:update' },
      },
    ],
  };

  const manager = {
    id: 'manager-1',
    role: UserRole.MANAGER,
    hasCustomPermissions: false,
    userPermissions: [],
  };

  const regularUser1 = {
    id: 'user-1',
    role: UserRole.USER,
  };

  const regularUser2 = {
    id: 'user-2',
    role: UserRole.USER,
  };

  describe('Administrative Update vs Unchecked Admin 2', () => {
    it('should allow Admin 1 (with default role) to update another user', async () => {
      const allowed = await can(admin1, 'update', 'User', regularUser1);
      expect(allowed).toBe(true);
    });

    it('should FORBID Admin 2 (with users:update unchecked) from updating another user', async () => {
      const allowed = await can(admin2Restricted, 'update', 'User', regularUser1);
      expect(allowed).toBe(false);
    });

    it('should allow Admin 2 to update their OWN profile (ABAC self-ownership)', async () => {
      const allowed = await can(admin2Restricted, 'update', 'User', {
        id: admin2Restricted.id,
        role: UserRole.ADMIN,
      });
      expect(allowed).toBe(true);
    });
  });

  describe('Role Hierarchy & Super Admin Protection (ABAC)', () => {
    it('should prevent Admin 1 from updating a SUPER_ADMIN account', async () => {
      const allowed = await can(admin1, 'update', 'User', superAdmin);
      expect(allowed).toBe(false);
    });

    it('should allow SUPER_ADMIN to update any account', async () => {
      expect(await can(superAdmin, 'update', 'User', admin1)).toBe(true);
      expect(await can(superAdmin, 'delete', 'User', admin1)).toBe(true);
    });

    it('should allow Manager to update regular user, but prevent updating an Admin', async () => {
      expect(await can(manager, 'update', 'User', regularUser1)).toBe(true);
      expect(await can(manager, 'update', 'User', admin1)).toBe(false);
    });

    it('should prevent non-admin from deleting user accounts', async () => {
      expect(await can(regularUser1, 'delete', 'User', regularUser2)).toBe(false);
      expect(await can(manager, 'delete', 'User', regularUser1)).toBe(false);
    });

    it('should allow Admin 1 to delete regular user, but prevent deleting self or SUPER_ADMIN', async () => {
      expect(await can(admin1, 'delete', 'User', regularUser1)).toBe(true);
      expect(await can(admin1, 'delete', 'User', { id: admin1.id, role: UserRole.ADMIN })).toBe(false);
      expect(await can(admin1, 'delete', 'User', superAdmin)).toBe(false);
    });
  });
});
