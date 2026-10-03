import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userModule } from '../../../src/modules/user.module';
import { prisma } from '../../../src/config/db';
import { comparePassword } from '../../../src/utils/password.util';
import { ApiError } from '../../../src/utils/apiError';

vi.mock('../../../src/config/db', () => ({
  prisma: {
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('UserModule Lifecycle Hooks', () => {
  const hooks = userModule.config.hooks!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeCreate', () => {
    it('should resolve role name to roleId, remove role field, hash password, and normalize email', async () => {
      const mockRoleId = '11111111-2222-3333-4444-555555555555';
      vi.mocked(prisma.role.findFirst).mockResolvedValue({
        id: mockRoleId,
        name: 'USER',
      } as any);

      const input = {
        firstName: 'Aashish',
        lastName: 'Bhandari',
        email: 'AASHISH@EXAMPLE.COM ',
        password: 'Password123',
        role: 'USER',
      };

      const result = await hooks.beforeCreate!(input);

      // Verify email is lowercased and trimmed
      expect(result.email).toBe('aashish@example.com');

      // Verify role is replaced with roleId
      expect(result.roleId).toBe(mockRoleId);
      expect(result.role).toBeUndefined();

      // Verify password was hashed
      expect(result.password).not.toBe('Password123');
      const isMatch = await comparePassword('Password123', result.password as string);
      expect(isMatch).toBe(true);

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'USER', mode: 'insensitive' } },
      });
    });

    it('should resolve roleId directly if UUID is provided', async () => {
      const mockRoleId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      vi.mocked(prisma.role.findUnique).mockResolvedValue({
        id: mockRoleId,
        name: 'ADMIN',
      } as any);

      const input = {
        firstName: 'Admin',
        email: 'admin@example.com',
        roleId: mockRoleId,
      };

      const result = await hooks.beforeCreate!(input);

      expect(result.roleId).toBe(mockRoleId);
      expect(result.role).toBeUndefined();
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: mockRoleId },
      });
    });

    it('should throw ApiError if role does not exist', async () => {
      vi.mocked(prisma.role.findFirst).mockResolvedValue(null);

      const input = {
        firstName: 'Test',
        email: 'test@example.com',
        role: 'NON_EXISTENT_ROLE',
      };

      await expect(hooks.beforeCreate!(input)).rejects.toThrow(ApiError);
    });
  });

  describe('beforeUpdate', () => {
    it('should resolve role to roleId and hash password if provided on update', async () => {
      const mockRoleId = '22222222-3333-4444-5555-666666666666';
      vi.mocked(prisma.role.findFirst).mockResolvedValue({
        id: mockRoleId,
        name: 'MANAGER',
      } as any);

      const input = {
        password: 'NewPassword123',
        role: 'MANAGER',
      };

      const result = await hooks.beforeUpdate!('user-id', input);

      expect(result.roleId).toBe(mockRoleId);
      expect(result.role).toBeUndefined();
      const isMatch = await comparePassword('NewPassword123', result.password as string);
      expect(isMatch).toBe(true);
    });

    it('should preserve role if not provided in update payload', async () => {
      const input = {
        firstName: 'UpdatedName',
      };

      const result = await hooks.beforeUpdate!('user-id', input);

      expect(result.firstName).toBe('UpdatedName');
      expect(result.roleId).toBeUndefined();
      expect(result.role).toBeUndefined();
      expect(prisma.role.findFirst).not.toHaveBeenCalled();
    });
  });
});
