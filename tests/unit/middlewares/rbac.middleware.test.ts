import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { UserRole } from '../../../src/constants/roles';
import { Permission } from '../../../src/constants/permissions';
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireOwnerOrPermission,
} from '../../../src/middlewares/rbac.middleware';

describe('RBAC Middlewares', () => {
  const mockResponse = {} as Response;

  describe('requirePermission', () => {
    it('should throw 401 if req.user is missing', () => {
      const req = {} as Request;
      const next = vi.fn();

      requirePermission(Permission.USERS_DELETE)(req, mockResponse, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should throw 403 if user does not have required permission', () => {
      const req = { user: { role: UserRole.USER } } as unknown as Request;
      const next = vi.fn();

      requirePermission(Permission.USERS_DELETE)(req, mockResponse, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain("Missing required permission 'users:delete'");
    });

    it('should call next() if user has the permission via wildcard', () => {
      const req = { user: { role: UserRole.ADMIN } } as unknown as Request;
      const next = vi.fn();

      requirePermission(Permission.USERS_DELETE)(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() if user has custom permission in metadata', () => {
      const req = {
        user: {
          role: UserRole.USER,
          metadata: { permissions: [Permission.USERS_DELETE] },
        },
      } as unknown as Request;
      const next = vi.fn();

      requirePermission(Permission.USERS_DELETE)(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireAnyPermission', () => {
    it('should throw 401 if req.user is missing', () => {
      const req = {} as Request;
      const next = vi.fn();

      requireAnyPermission(Permission.USERS_READ, Permission.USERS_DELETE)(
        req,
        mockResponse,
        next,
      );

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should throw 403 if user lacks all specified permissions', () => {
      const req = { user: { role: UserRole.USER } } as unknown as Request;
      const next = vi.fn();

      requireAnyPermission(Permission.USERS_DELETE, Permission.SETTINGS_MANAGE)(
        req,
        mockResponse,
        next,
      );

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
    });

    it('should allow user if they match at least one permission', () => {
      const req = { user: { role: UserRole.USER } } as unknown as Request;
      const next = vi.fn();

      requireAnyPermission(Permission.USERS_DELETE, Permission.USERS_READ)(
        req,
        mockResponse,
        next,
      );

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireAllPermissions', () => {
    it('should throw 403 if user is missing one of the required permissions', () => {
      const req = { user: { role: UserRole.MANAGER } } as unknown as Request;
      const next = vi.fn();

      requireAllPermissions(Permission.USERS_READ, Permission.ROLES_MANAGE)(
        req,
        mockResponse,
        next,
      );

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
    });

    it('should call next() if user satisfies all permissions', () => {
      const req = { user: { role: UserRole.ADMIN } } as unknown as Request;
      const next = vi.fn();

      requireAllPermissions(Permission.USERS_READ, Permission.ROLES_MANAGE)(
        req,
        mockResponse,
        next,
      );

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireRole', () => {
    it('should allow higher role in hierarchy by default', () => {
      const req = { user: { role: UserRole.ADMIN } } as unknown as Request;
      const next = vi.fn();

      requireRole(UserRole.MANAGER)(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject lower role with 403', () => {
      const req = { user: { role: UserRole.USER } } as unknown as Request;
      const next = vi.fn();

      requireRole(UserRole.MANAGER)(req, mockResponse, next);

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
    });

    it('should enforce exact role when allowHigher is false', () => {
      const req = { user: { role: UserRole.ADMIN } } as unknown as Request;
      const next = vi.fn();

      requireRole(UserRole.MANAGER, { allowHigher: false })(req, mockResponse, next);

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
    });
  });

  describe('requireOwnerOrPermission', () => {
    it('should allow user if they are the resource owner', async () => {
      const req = {
        user: { id: 'usr-123', role: UserRole.USER },
        params: { id: 'usr-123' },
      } as unknown as Request;
      const next = vi.fn();

      const middleware = requireOwnerOrPermission({
        permission: Permission.USERS_UPDATE,
        getOwnerId: (r) => r.params.id,
      });

      await middleware(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow admin with permission even if they are not the owner', async () => {
      const req = {
        user: { id: 'admin-999', role: UserRole.ADMIN },
        params: { id: 'usr-123' },
      } as unknown as Request;
      const next = vi.fn();

      const middleware = requireOwnerOrPermission({
        permission: Permission.USERS_UPDATE,
        getOwnerId: (r) => r.params.id,
      });

      await middleware(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject user with 403 if they are neither owner nor hold the permission', async () => {
      const req = {
        user: { id: 'other-user', role: UserRole.USER },
        params: { id: 'usr-123' },
      } as unknown as Request;
      const next = vi.fn();

      const middleware = requireOwnerOrPermission({
        permission: Permission.USERS_UPDATE,
        getOwnerId: (r) => r.params.id,
      });

      await middleware(req, mockResponse, next);

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Forbidden');
    });
  });
});
