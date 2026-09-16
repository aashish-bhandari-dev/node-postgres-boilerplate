import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { UserRole } from '../../../src/constants/roles';
import {
  authenticate,
  authorize,
  requireEmailVerified,
  requirePhoneVerified,
} from '../../../src/middlewares/auth.middleware';

describe('Auth Middleware', () => {
  const mockResponse = {} as Response;

  describe('authenticate', () => {
    it('should throw 401 if Authorization header is missing', async () => {
      const req = { headers: {} } as Request;
      const next = vi.fn();

      await authenticate()(req, mockResponse, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('token is required');
    });

    it('should throw 401 if Authorization header does not start with Bearer', async () => {
      const req = { headers: { authorization: 'Basic 12345' } } as Request;
      const next = vi.fn();

      await authenticate()(req, mockResponse, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should throw 401 for an invalid token string', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token.string' } } as Request;
      const next = vi.fn();

      await authenticate()(req, mockResponse, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });
  });

  describe('authorize', () => {
    it('should allow user with authorized role', () => {
      const req = {
        user: { role: UserRole.ADMIN },
      } as unknown as Request;
      const next = vi.fn();

      authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith(); // called with no error
    });

    it('should block user with unauthorized role with 403', () => {
      const req = {
        user: { role: UserRole.USER },
      } as unknown as Request;
      const next = vi.fn();

      authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)(req, mockResponse, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Forbidden');
    });
  });

  describe('requireEmailVerified', () => {
    it('should allow user when isEmailVerified is true', () => {
      const req = {
        user: { isEmailVerified: true },
      } as unknown as Request;
      const next = vi.fn();

      requireEmailVerified(true)(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should block user when isEmailVerified is false and enforce is true', () => {
      const req = {
        user: { isEmailVerified: false },
      } as unknown as Request;
      const next = vi.fn();

      requireEmailVerified(true)(req, mockResponse, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.errors?.[0]?.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('requirePhoneVerified', () => {
    it('should allow user when isPhoneVerified is true', () => {
      const req = {
        user: { isPhoneVerified: true },
      } as unknown as Request;
      const next = vi.fn();

      requirePhoneVerified(true)(req, mockResponse, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should block user when isPhoneVerified is false and enforce is true', () => {
      const req = {
        user: { isPhoneVerified: false },
      } as unknown as Request;
      const next = vi.fn();

      requirePhoneVerified(true)(req, mockResponse, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.errors?.[0]?.code).toBe('PHONE_NOT_VERIFIED');
    });
  });
});
