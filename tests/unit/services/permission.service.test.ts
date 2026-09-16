import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '../../../src/constants/roles';
import { PermissionService } from '../../../src/services/permission.service';
import { prisma } from '../../../src/config/db';
import { SYSTEM_PERMISSIONS } from '../../../src/constants/permissions';

vi.mock('../../../src/config/db', () => ({
  prisma: {
    permission: {
      findMany: vi.fn(),
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

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
    service.clearCache();
  });

  describe('getAllPermissions', () => {
    it('should return permissions from database when available', async () => {
      const mockRecords = [
        {
          id: 'perm-1',
          name: 'users:read',
          displayName: 'View Users',
          description: 'Read users',
          module: 'users',
          action: 'read',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.permission.findMany).mockResolvedValue(mockRecords);

      const perms = await service.getAllPermissions();
      expect(perms).toHaveLength(1);
      expect(perms[0].name).toBe('users:read');
      expect(prisma.permission.findMany).toHaveBeenCalledTimes(1);

      // Subsequent call within TTL should use in-memory cache
      const cached = await service.getAllPermissions();
      expect(cached).toHaveLength(1);
      expect(prisma.permission.findMany).toHaveBeenCalledTimes(1); // not called again
    });

    it('should fall back to SYSTEM_PERMISSIONS if database records are empty', async () => {
      vi.mocked(prisma.permission.findMany).mockResolvedValue([]);

      const perms = await service.getAllPermissions();
      expect(perms.length).toBe(SYSTEM_PERMISSIONS.length);
      expect(perms.some((p) => p.name === 'users:read')).toBe(true);
    });

    it('should correctly group permissions by module', () => {
      const perms = [
        {
          name: 'users:read',
          displayName: 'View Users',
          description: '',
          module: 'users',
          action: 'read',
        },
        {
          name: 'users:create',
          displayName: 'Create Users',
          description: '',
          module: 'users',
          action: 'create',
        },
        {
          name: 'settings:read',
          displayName: 'View Settings',
          description: '',
          module: 'settings',
          action: 'read',
        },
      ];

      const grouped = service.groupPermissionsByModule(perms);
      expect(Object.keys(grouped)).toEqual(['users', 'settings']);
      expect(grouped['users']).toHaveLength(2);
      expect(grouped['settings']).toHaveLength(1);
    });
  });

  describe('getRolePermissionsMatrix', () => {
    it('should return role permissions matrix for all default roles', async () => {
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

      const matrix = await service.getRolePermissionsMatrix();
      expect(matrix[UserRole.SUPER_ADMIN]).toContain('*');
      expect(matrix[UserRole.ADMIN]).toContain('users:*');
      expect(matrix[UserRole.MANAGER]).toContain('users:read');
      expect(matrix[UserRole.USER]).toContain('users:read');
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should throw 404 if user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.getUserEffectivePermissions('usr-unknown')).rejects.toThrow(
        "User with ID 'usr-unknown' not found",
      );
    });

    it('should return role defaults for standard user without custom permissions', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'usr-1',
        role: UserRole.MANAGER,
        hasCustomPermissions: false,
        userPermissions: [],
        deletedAt: null,
      } as never);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

      const result = await service.getUserEffectivePermissions('usr-1');

      expect(result.userId).toBe('usr-1');
      expect(result.role).toBe(UserRole.MANAGER);
      expect(result.hasCustomPermissions).toBe(false);
      expect(result.effectivePermissions).toContain('users:read');
      expect(result.effectivePermissions).toContain('users:update');
      expect(result.directPermissions).toEqual([]);
    });

    it('should return restricted effective permissions for user with custom overrides (view-only manager)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'usr-manager-2',
        role: UserRole.MANAGER,
        hasCustomPermissions: true,
        userPermissions: [
          {
            isGranted: true,
            permission: { name: 'users:read', displayName: 'View Users' },
          },
          {
            isGranted: false,
            permission: { name: 'users:update', displayName: 'Update Users' },
          },
          {
            isGranted: false,
            permission: { name: 'settings:read', displayName: 'View Settings' },
          },
          {
            isGranted: false,
            permission: { name: 'audit:read', displayName: 'View Audit Logs' },
          },
        ],
        deletedAt: null,
      } as never);
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

      const result = await service.getUserEffectivePermissions('usr-manager-2');

      expect(result.hasCustomPermissions).toBe(true);
      expect(result.effectivePermissions).toContain('users:read');
      expect(result.effectivePermissions).not.toContain('users:update');
      expect(result.effectivePermissions).not.toContain('settings:read');
      expect(result.effectivePermissions).not.toContain('audit:read');
      expect(result.effectivePermissions).toEqual(['users:read']);
    });
  });

  describe('updateUserPermissions', () => {
    it('should reset user permissions when resetToDefault is true', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'usr-1',
        role: UserRole.MANAGER,
        hasCustomPermissions: true,
        userPermissions: [],
        deletedAt: null,
      } as never);

      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await service.updateUserPermissions('usr-1', { resetToDefault: true });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should compute ALLOW and DENY overrides when updating to view-only manager via permissions array', async () => {
      // Mock user is MANAGER
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'manager-1',
        role: UserRole.MANAGER,
        hasCustomPermissions: false,
        userPermissions: [],
        deletedAt: null,
      } as never);

      // System has permissions
      vi.mocked(prisma.permission.findMany).mockResolvedValue([
        { id: 'p-1', name: 'users:read' },
        { id: 'p-2', name: 'users:update' },
        { id: 'p-3', name: 'settings:read' },
        { id: 'p-4', name: 'audit:read' },
      ] as never);

      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

      // Mock transaction execution
      const mockTx = {
        userPermission: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({}),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: never) => {
        return callback(mockTx);
      });

      // Admin requests that this manager ONLY has ['users:read']
      await service.updateUserPermissions('manager-1', {
        permissions: ['users:read'],
      });

      // Verification:
      // In transaction:
      // 1. Existing user permissions cleared
      expect(mockTx.userPermission.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'manager-1' },
      });

      // 2. Unwanted role permissions (users:update, settings:read, audit:read) denied
      expect(mockTx.userPermission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'manager-1',
            permissionId: 'p-2', // users:update
            isGranted: false,
          }),
        }),
      );

      // 3. hasCustomPermissions set to true
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'manager-1' },
        data: { hasCustomPermissions: true },
      });
    });

    it('should throw 400 if an unknown permission is provided in permissions list', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'usr-1',
        role: UserRole.USER,
        deletedAt: null,
      } as never);

      vi.mocked(prisma.permission.findMany).mockResolvedValue([
        { id: 'p-1', name: 'users:read' },
      ] as never);

      await expect(
        service.updateUserPermissions('usr-1', {
          permissions: ['non_existent_permission'],
        }),
      ).rejects.toThrow("Unknown permission 'non_existent_permission'");
    });
  });
});
