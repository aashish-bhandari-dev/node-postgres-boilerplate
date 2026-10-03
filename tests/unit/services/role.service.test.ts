import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleService } from '../../../src/services/role.service';
import { prisma } from '../../../src/config/db';
import { ApiError } from '../../../src/utils/apiError';

vi.mock('../../../src/config/db', () => ({
  prisma: {
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    rolePermission: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('RoleService', () => {
  let roleService: RoleService;

  beforeEach(() => {
    vi.clearAllMocks();
    roleService = new RoleService();
  });

  describe('getAllRoles', () => {
    it('should return paginated roles with user count and permission names', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'ADMIN',
          displayName: 'Administrator',
          description: 'Admin access',
          hierarchy: 80,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { users: 5 },
          rolePermissions: [
            { permission: { name: 'users:read' } },
            { permission: { name: 'users:create' } },
          ],
        },
      ];

      vi.mocked(prisma.role.findMany).mockResolvedValue(mockRoles as any);
      vi.mocked(prisma.role.count).mockResolvedValue(1);

      const result = await roleService.getAllRoles({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('ADMIN');
      expect(result.items[0].usersCount).toBe(5);
      expect(result.items[0].permissions).toEqual(['users:read', 'users:create']);
      expect(result.pagination.total).toBe(1);
    });

    it('should query roles with searchTerm when provided', async () => {
      vi.mocked(prisma.role.findMany).mockResolvedValue([]);
      vi.mocked(prisma.role.count).mockResolvedValue(0);

      await roleService.getAllRoles({ searchTerm: 'admin' });

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'admin', mode: 'insensitive' } },
              { displayName: { contains: 'admin', mode: 'insensitive' } },
              { description: { contains: 'admin', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('getRoleById', () => {
    it('should return role with permissions when found', async () => {
      const mockRole = {
        id: 'role-1',
        name: 'EDITOR',
        displayName: 'Editor',
        description: 'Content editor',
        hierarchy: 50,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { users: 2 },
        rolePermissions: [{ permission: { name: 'posts:write' } }],
      };

      vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as any);

      const result = await roleService.getRoleById('role-1');

      expect(result.id).toBe('role-1');
      expect(result.name).toBe('EDITOR');
      expect(result.permissions).toEqual(['posts:write']);
    });

    it('should throw 404 when role does not exist', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

      await expect(roleService.getRoleById('non-existent')).rejects.toThrow(ApiError);
    });
  });

  describe('createRole', () => {
    it('should create a custom role and assign permissions if provided', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

      const createdRole = {
        id: 'role-new',
        name: 'MODERATOR',
        displayName: 'Community Moderator',
        description: 'Moderates comments',
        hierarchy: 50,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.role.create).mockResolvedValue(createdRole as any);
      vi.mocked(prisma.permission.findMany).mockResolvedValue([
        { id: 'perm-1', name: 'comments:delete' } as any,
      ]);
      const createMock = vi.fn().mockResolvedValue(createdRole);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          role: {
            create: createMock,
            findUnique: vi.fn().mockResolvedValue({
              ...createdRole,
              _count: { users: 0 },
              rolePermissions: [{ permission: { name: 'comments:delete' } }],
            }),
          },
          rolePermission: {
            deleteMany: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
          },
        });
      });

      const result = await roleService.createRole({
        name: 'moderator',
        displayName: 'Community Moderator',
        description: 'Moderates comments',
        hierarchy: 50,
        permissions: ['comments:delete'],
      });

      expect(result.name).toBe('MODERATOR');
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'MODERATOR',
          isSystem: false,
        }),
      });
    });

    it('should throw conflict error if role name already exists', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue({ id: 'existing' } as any);

      await expect(
        roleService.createRole({
          name: 'ADMIN',
          displayName: 'Admin duplicate',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('updateRole', () => {
    it('should update role displayName and description', async () => {
      const existing = {
        id: 'role-1',
        name: 'CUSTOM_ROLE',
        displayName: 'Old Name',
        isSystem: false,
      };

      const updated = {
        ...existing,
        displayName: 'New Name',
        _count: { users: 0 },
        rolePermissions: [],
      };

      vi.mocked(prisma.role.findUnique).mockResolvedValue(existing as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          role: {
            update: vi.fn().mockResolvedValue(updated),
            findUnique: vi.fn().mockResolvedValue(updated),
          },
          rolePermission: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
          },
        });
      });

      const result = await roleService.updateRole('role-1', {
        displayName: 'New Name',
      });

      expect(result.displayName).toBe('New Name');
    });

    it('should disallow renaming system roles', async () => {
      const systemRole = {
        id: 'role-admin',
        name: 'ADMIN',
        isSystem: true,
      };

      vi.mocked(prisma.role.findUnique).mockResolvedValue(systemRole as any);

      await expect(
        roleService.updateRole('role-admin', {
          name: 'NEW_ADMIN',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('deleteRole', () => {
    it('should disallow deleting system roles', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue({
        id: 'sys-role',
        name: 'SUPER_ADMIN',
        isSystem: true,
        _count: { users: 0 },
      } as any);

      await expect(roleService.deleteRole('sys-role')).rejects.toThrow(ApiError);
    });

    it('should disallow deleting roles that have active users assigned', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue({
        id: 'role-1',
        name: 'CUSTOM_ROLE',
        isSystem: false,
        _count: { users: 3 },
      } as any);

      await expect(roleService.deleteRole('role-1')).rejects.toThrow(ApiError);
    });

    it('should successfully delete a role with zero users', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue({
        id: 'role-1',
        name: 'CUSTOM_ROLE',
        isSystem: false,
        _count: { users: 0 },
      } as any);
      vi.mocked(prisma.role.delete).mockResolvedValue({
        id: 'role-1',
        name: 'CUSTOM_ROLE',
        displayName: 'Custom Role',
        description: null,
        hierarchy: 0,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
        _count: { users: 0 },
      } as any);

      await expect(roleService.deleteRole('role-1')).resolves.toBeDefined();
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });
  });
});
