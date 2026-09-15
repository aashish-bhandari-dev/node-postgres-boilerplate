import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { requirePolicy } from '../../../src/middlewares/policy.middleware';
import { definePolicy, PolicyRegistry } from '../../../src/core/policy/policy.registry';

describe('Policy Middleware (requirePolicy)', () => {
  const mockResponse = {} as Response;

  beforeEach(() => {
    PolicyRegistry.clear();
  });

  it('should return 401 if req.user is undefined', async () => {
    const req = {} as Request;
    const next = vi.fn();

    const middleware = requirePolicy('read', 'Document');
    await middleware(req, mockResponse, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toContain('Authentication required');
  });

  it('should return 404 if loadResource returns null', async () => {
    const req = {
      user: { id: 'usr-1', role: UserRole.USER },
      params: { id: 'doc-not-found' },
    } as unknown as Request;
    const next = vi.fn();

    const middleware = requirePolicy('read', 'Document', {
      loadResource: async () => null,
    });
    await middleware(req, mockResponse, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('Document not found');
  });

  interface MockDoc {
    id: string;
    ownerId: string;
  }

  it('should deny request with 403 if ABAC policy condition is not met', async () => {
    definePolicy<MockDoc>('Document', (builder) => {
      builder.can('update', 'Document').when((user, doc) => {
        return doc?.ownerId === user.id;
      });
    });

    const req = {
      user: { id: 'user-1', role: UserRole.USER },
      params: { id: 'doc-99' },
    } as unknown as Request;
    const next = vi.fn();

    const middleware = requirePolicy('update', 'Document', {
      loadResource: async () => ({ id: 'doc-99', ownerId: 'user-2' }), // different owner
    });
    await middleware(req, mockResponse, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain('You do not have permission to update this Document');
  });

  it('should allow request when ABAC policy condition passes', async () => {
    definePolicy<MockDoc>('Document', (builder) => {
      builder.can('update', 'Document').when((user, doc) => {
        return doc?.ownerId === user.id;
      });
    });


    const req = {
      user: { id: 'user-1', role: UserRole.USER },
      params: { id: 'doc-99' },
    } as unknown as Request;
    const next = vi.fn();

    const middleware = requirePolicy('update', 'Document', {
      loadResource: async () => ({ id: 'doc-99', ownerId: 'user-1' }), // matching owner
    });
    await middleware(req, mockResponse, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should evaluate environmental context passed via getContext', async () => {
    definePolicy('SecureVault', (builder) => {
      builder.can('access', 'SecureVault').when((_user, _res, context) => {
        return context?.ip === '10.0.0.1'; // Only allow access from intranet IP
      });
    });

    const allowedReq = {
      user: { id: 'usr-1', role: UserRole.USER },
      ip: '10.0.0.1',
    } as unknown as Request;
    const deniedReq = {
      user: { id: 'usr-1', role: UserRole.USER },
      ip: '192.168.1.5',
    } as unknown as Request;

    const nextAllowed = vi.fn();
    const nextDenied = vi.fn();

    const middleware = requirePolicy('access', 'SecureVault');

    await middleware(allowedReq, mockResponse, nextAllowed);
    expect(nextAllowed).toHaveBeenCalledWith();

    await middleware(deniedReq, mockResponse, nextDenied);
    const err = nextDenied.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});
