import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '../../../src/constants/roles';
import { PermissionService } from '../../../src/services/permission.service';
import { prisma } from '../../../src/config/db';
import { hasPermission, hasPermissionTo, canDo } from '../../../src/utils/rbac.util';

vi.mock('../../../src/config/db', () => ({
  prisma: {
    permission: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    rolePermission: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPermission: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Laravel Spatie-Style Roles & Permissions Flow', () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
    service.clearCache();
  });

  describe('Admin 1 vs Admin 2 Permission Differentiation', () => {
    it('should grant users:update to Admin 1 (default role) and deny users:update to Admin 2 (unchecked)', async () => {
      // Admin 1: Default role with no overrides
      const admin1Context = {
        id: 'admin-1',
        role: UserRole.ADMIN,
        hasCustomPermissions: false,
        userPermissions: [],
      };

      // Admin 2: ADMIN role, but users:update is unchecked (isGranted: false)
      const admin2Context = {
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

      // Admin 1 has permission via role inheritance
      expect(hasPermission(admin1Context, 'users:update')).toBe(true);
      expect(hasPermissionTo(admin1Context, 'users:update')).toBe(true);
      expect(canDo(admin1Context, 'users:update')).toBe(true);

      // Admin 2 has users:update explicitly revoked / unchecked
      expect(hasPermission(admin2Context, 'users:update')).toBe(false);
      expect(hasPermissionTo(admin2Context, 'users:update')).toBe(false);
      expect(canDo(admin2Context, 'users:update')).toBe(false);

      // Admin 2 still has other role permissions like users:read
      expect(hasPermission(admin2Context, 'users:read')).toBe(true);
      expect(hasPermission(admin2Context, 'settings:read')).toBe(true);
    });
  });

  describe('Frontend UI Checkbox Matrix API', () => {
    it('should return catalog with isInheritedFromRole, isOverridden, and isGranted for UI checkboxes', async () => {
      vi.mocked(prisma.permission.findMany).mockResolvedValue([
        {
          id: 'perm-read',
          name: 'users:read',
          displayName: 'View Users',
          description: 'View user listing',
          module: 'users',
          action: 'read',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perm-update',
          name: 'users:update',
          displayName: 'Update Users',
          description: 'Edit user accounts',
          module: 'users',
          action: 'update',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

      // Admin 2 has users:update unchecked
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-2',
        role: UserRole.ADMIN,
        hasCustomPermissions: true,
        userPermissions: [
          {
            isGranted: false,
            permission: { name: 'users:update', displayName: 'Update Users' },
          },
        ],
        deletedAt: null,
      } as never);

      const res = await service.getUserEffectivePermissions('admin-2');

      expect(res.userId).toBe('admin-2');
      expect(res.hasCustomPermissions).toBe(true);
      expect(res.catalog).toBeDefined();
      expect(res.groupedCatalog).toBeDefined();

      const usersUpdateItem = res.catalog.find((c) => c.name === 'users:update');
      expect(usersUpdateItem).toBeDefined();
      expect(usersUpdateItem!.isInheritedFromRole).toBe(true); // ADMIN role includes users:*
      expect(usersUpdateItem!.isOverridden).toBe(true);       // explicitly modified for admin 2
      expect(usersUpdateItem!.isGranted).toBe(false);         // unchecked in UI!

      const usersReadItem = res.catalog.find((c) => c.name === 'users:read');
      expect(usersReadItem).toBeDefined();
      expect(usersReadItem!.isInheritedFromRole).toBe(true);
      expect(usersReadItem!.isOverridden).toBe(false);
      expect(usersReadItem!.isGranted).toBe(true);           // checked by default from role

      // Verify groupedCatalog is indexed by module
      expect(res.groupedCatalog['users']).toHaveLength(2);
    });
  });

  describe('Spatie Helper Methods', () => {
    it('givePermissionTo should grant a direct permission override', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'usr-1',
        role: UserRole.USER,
        hasCustomPermissions: false,
        userPermissions: [],
        deletedAt: null,
      } as never);

      vi.mocked(prisma.permission.findMany).mockResolvedValue([
        {
          id: 'perm-audit',
          name: 'audit:read',
          displayName: 'View Audit Logs',
          description: '',
          module: 'audit',
          action: 'read',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return cb;
      });

      const updateSpy = vi.spyOn(service, 'updateUserPermissions');
      await service.givePermissionTo('usr-1', 'audit:read');

      expect(updateSpy).toHaveBeenCalledWith('usr-1', {
        overrides: [{ permission: 'audit:read', isGranted: true }],
      });
    });

    it('revokePermissionTo should uncheck / deny a permission override', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-2',
        role: UserRole.ADMIN,
        hasCustomPermissions: false,
        userPermissions: [],
        deletedAt: null,
      } as never);

      const updateSpy = vi.spyOn(service, 'updateUserPermissions');
      await service.revokePermissionTo('admin-2', 'users:update');

      expect(updateSpy).toHaveBeenCalledWith('admin-2', {
        overrides: [{ permission: 'users:update', isGranted: false }],
      });
    });

    it('syncPermissions should diff desired permissions and set custom overrides', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-2',
        role: UserRole.ADMIN,
        hasCustomPermissions: false,
        userPermissions: [],
        deletedAt: null,
      } as never);

      const updateSpy = vi.spyOn(service, 'updateUserPermissions');
      await service.syncPermissions('admin-2', ['users:read', 'settings:read']);

      expect(updateSpy).toHaveBeenCalledWith('admin-2', {
        permissions: ['users:read', 'settings:read'],
      });
    });
  });
});
