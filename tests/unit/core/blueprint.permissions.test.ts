import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { createBlueprintRouter } from '../../../src/core/blueprint/blueprint.router';
import { BaseBlueprintController } from '../../../src/core/blueprint/blueprint.controller';
import { BaseBlueprintService } from '../../../src/core/blueprint/blueprint.service';
import { Permission } from '../../../src/constants/permissions';

describe('Blueprint Declarative Permissions', () => {
  const mockService = {} as BaseBlueprintService;
  const mockController = new BaseBlueprintController(mockService);

  mockController.getAll = vi.fn();
  mockController.create = vi.fn();
  mockController.getById = vi.fn();
  mockController.update = vi.fn();
  mockController.delete = vi.fn();

  it('should attach permission and auth middlewares to configured routes', () => {
    const router = createBlueprintRouter(
      {
        model: 'user',
        permissions: {
          list: Permission.USERS_READ,
          create: Permission.USERS_CREATE,
          delete: Permission.USERS_DELETE,
        },
      },
      mockController,
    );

    // Verify router has routes registered
    const routes = router.stack.filter((layer) => layer.route);
    const rootRoute = routes.find((layer) => layer.route?.path === '/');
    const idRoute = routes.find((layer) => layer.route?.path === '/:id');

    expect(rootRoute).toBeDefined();
    expect(idRoute).toBeDefined();

    // Check that GET / has middleware stack: [authenticate, requirePermission, getAll]
    const getHandlers = rootRoute!.route.stack.filter(
      (s: { method: string }) => s.method === 'get',
    );
    expect(getHandlers.length).toBe(3); // auth + requirePermission + controller

    // Check that POST / has middleware stack: [authenticate, requirePermission, create]
    const postHandlers = rootRoute!.route.stack.filter(
      (s: { method: string }) => s.method === 'post',
    );
    expect(postHandlers.length).toBe(3);

    // Check that DELETE /:id has middleware stack: [authenticate, requirePermission, delete]
    const deleteHandlers = idRoute!.route.stack.filter(
      (s: { method: string }) => s.method === 'delete',
    );
    expect(deleteHandlers.length).toBe(3);
  });

  it('should deny execution when user lacks required permission on route handler', () => {
    const router = createBlueprintRouter(
      {
        model: 'user',
        permissions: {
          delete: Permission.USERS_DELETE,
        },
      },
      mockController,
    );

    const idRoute = router.stack.find((l) => l.route?.path === '/:id');
    const deleteHandlers = idRoute!.route.stack.filter(
      (s: { method: string }) => s.method === 'delete',
    );

    // The second handler is requirePermission(Permission.USERS_DELETE)
    const permissionHandler = deleteHandlers[1].handle;

    const req = {
      user: { role: UserRole.USER },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    permissionHandler(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("Missing required permission 'users:delete'");
  });

  it('should allow execution when user has permission on route handler', () => {
    const router = createBlueprintRouter(
      {
        model: 'user',
        permissions: {
          delete: Permission.USERS_DELETE,
        },
      },
      mockController,
    );

    const idRoute = router.stack.find((l) => l.route?.path === '/:id');
    const deleteHandlers = idRoute!.route.stack.filter(
      (s: { method: string }) => s.method === 'delete',
    );

    const permissionHandler = deleteHandlers[1].handle;

    const req = {
      user: { role: UserRole.ADMIN },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    permissionHandler(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should apply ABAC row-level security scope filter in blueprint service', async () => {
    const mockDelegate = {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([{ id: 'art-1', authorId: 'usr-1' }]),
      findUnique: vi.fn().mockResolvedValue({ id: 'art-1', authorId: 'usr-1' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'art-1', authorId: 'usr-1' }),
    };

    class TestService extends BaseBlueprintService {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      protected override get delegate(): any {
        return mockDelegate;
      }
    }


    const scopedService = new TestService('article', {
      model: 'article',
      policy: {
        scope: (user) => (user?.role === UserRole.USER ? { authorId: user.id } : {}),
      },
    });

    // 1. When regular user queries, where clause includes { authorId: user.id }
    await scopedService.getAll({
      user: { id: 'usr-1', role: UserRole.USER },
    });

    expect(mockDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorId: 'usr-1' }),
      }),
    );

    // 2. When admin queries, where clause does NOT restrict by authorId
    mockDelegate.findMany.mockClear();
    await scopedService.getAll({
      user: { id: 'admin-1', role: UserRole.ADMIN },
    });

    expect(mockDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });
});

