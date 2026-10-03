import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { permissionController } from '../../../src/controllers/permission.controller';
import { permissionService } from '../../../src/services/permission.service';

vi.mock('../../../src/services/permission.service', () => ({
  permissionService: {
    getAllPermissions: vi.fn(),
    groupPermissionsByModule: vi.fn(),
    getRolePermissionsMatrix: vi.fn(),
    getUserEffectivePermissions: vi.fn(),
    updateUserPermissions: vi.fn(),
    resetUserPermissions: vi.fn(),
  },
}));

describe('PermissionController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      query: {},
      params: {},
      body: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('listPermissions', () => {
    it('should return flat list of permissions', async () => {
      const mockList = [
        {
          name: 'users:read',
          displayName: 'View Users',
          description: '',
          module: 'users',
          action: 'read',
        },
      ];
      vi.mocked(permissionService.getAllPermissions).mockResolvedValue(mockList);

      await permissionController.listPermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockList,
        }),
      );
    });

    it('should return grouped permissions when grouped=true', async () => {
      mockReq.query = { grouped: 'true' };
      const mockList = [
        {
          name: 'users:read',
          displayName: 'View Users',
          description: '',
          module: 'users',
          action: 'read',
        },
      ];
      const mockGrouped = { users: mockList };

      vi.mocked(permissionService.getAllPermissions).mockResolvedValue(mockList);
      vi.mocked(permissionService.groupPermissionsByModule).mockReturnValue(mockGrouped);

      await permissionController.listPermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(permissionService.groupPermissionsByModule).toHaveBeenCalledWith(mockList);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockGrouped,
        }),
      );
    });

    it('should filter permissions when searchTerm is provided', async () => {
      mockReq.query = { searchTerm: 'write' };
      const mockList = [
        {
          name: 'users:read',
          displayName: 'View Users',
          description: '',
          module: 'users',
          action: 'read',
        },
        {
          name: 'users:write',
          displayName: 'Create Users',
          description: '',
          module: 'users',
          action: 'write',
        },
      ];

      vi.mocked(permissionService.getAllPermissions).mockResolvedValue(mockList);

      await permissionController.listPermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [mockList[1]],
        }),
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should call permissionService.getUserEffectivePermissions with param id', async () => {
      mockReq.params = { id: 'usr-123' };
      const mockResponse = {
        userId: 'usr-123',
        role: 'MANAGER' as never,
        hasCustomPermissions: true,
        rolePermissions: ['users:read', 'users:update'],
        directPermissions: [],
        effectivePermissions: ['users:read'],
      };

      vi.mocked(permissionService.getUserEffectivePermissions).mockResolvedValue(
        mockResponse,
      );

      await permissionController.getUserPermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(permissionService.getUserEffectivePermissions).toHaveBeenCalledWith('usr-123');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResponse,
        }),
      );
    });
  });

  describe('updateUserPermissions', () => {
    it('should call permissionService.updateUserPermissions with id and body', async () => {
      mockReq.params = { id: 'usr-123' };
      mockReq.body = { permissions: ['users:read'] };

      const mockResponse = {
        userId: 'usr-123',
        role: 'MANAGER' as never,
        hasCustomPermissions: true,
        rolePermissions: ['users:read', 'users:update'],
        directPermissions: [],
        effectivePermissions: ['users:read'],
      };

      vi.mocked(permissionService.updateUserPermissions).mockResolvedValue(
        mockResponse,
      );

      await permissionController.updateUserPermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(permissionService.updateUserPermissions).toHaveBeenCalledWith(
        'usr-123',
        { permissions: ['users:read'] },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResponse,
        }),
      );
    });
  });

  describe('resetUserPermissions', () => {
    it('should call permissionService.resetUserPermissions with id', async () => {
      mockReq.params = { id: 'usr-123' };

      const mockResponse = {
        userId: 'usr-123',
        role: 'MANAGER' as never,
        hasCustomPermissions: false,
        rolePermissions: ['users:read', 'users:update'],
        directPermissions: [],
        effectivePermissions: ['users:read', 'users:update'],
      };

      vi.mocked(permissionService.resetUserPermissions).mockResolvedValue(
        mockResponse,
      );

      await permissionController.resetUserPermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(permissionService.resetUserPermissions).toHaveBeenCalledWith('usr-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResponse,
        }),
      );
    });
  });

  describe('getMePermissions', () => {
    it('should call getUserEffectivePermissions with req.user.id', async () => {
      mockReq.user = { id: 'usr-logged-in', role: 'ADMIN' as never };
      const mockResponse = {
        userId: 'usr-logged-in',
        role: 'ADMIN' as never,
        hasCustomPermissions: false,
        rolePermissions: ['users:*'],
        directPermissions: [],
        effectivePermissions: ['users:*'],
      };

      vi.mocked(permissionService.getUserEffectivePermissions).mockResolvedValue(
        mockResponse as never,
      );

      await permissionController.getMePermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(permissionService.getUserEffectivePermissions).toHaveBeenCalledWith('usr-logged-in');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResponse,
        }),
      );
    });

    it('should pass unauthorized error to next if req.user is missing', async () => {
      mockReq.user = undefined;

      await permissionController.getMePermissions(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

