import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { HttpStatus } from '../constants/httpStatus';
import { verifyAccessToken } from '../utils/token.util';
import { AuthenticateOptions, RequireVerifiedOptions } from '../types/auth.types';

/**
 * Authentication Middleware
 * Validates JWT access token, checks user active status, checks token invalidation on password change,
 * and optionally applies email and phone verification requirements.
 */
export const authenticate = (options?: AuthenticateOptions) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Authentication token is required');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw ApiError.unauthorized('Authentication token is missing');
      }

      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'TokenExpiredError') {
          throw ApiError.unauthorized('Authentication token has expired');
        }
        throw ApiError.unauthorized('Invalid authentication token');
      }

      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || user.deletedAt) {
        throw ApiError.unauthorized('User account no longer exists or has been deleted');
      }

      if (!user.isActive || user.isDeactivated) {
        throw ApiError.forbidden('User account is currently disabled or deactivated');
      }

      // Check if password was changed after token was issued
      if (user.passwordChangedAt && payload.iat) {
        const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (changedTimestamp > payload.iat) {
          throw ApiError.unauthorized('Password recently changed. Please log in again.');
        }
      }

      // Flexible email verification check:
      // Enforced if explicitly true in options, or if global env is enabled unless explicitly bypassed (options.requireEmailVerified === false)
      const shouldCheckEmail =
        options?.requireEmailVerified === true ||
        (options?.requireEmailVerified !== false && env.AUTH_REQUIRE_EMAIL_VERIFICATION);

      if (shouldCheckEmail && !user.isEmailVerified) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'Email verification is required to access this resource',
          [{ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address.' }],
        );
      }

      // Flexible phone verification check:
      const shouldCheckPhone =
        options?.requirePhoneVerified === true ||
        (options?.requirePhoneVerified !== false && env.AUTH_REQUIRE_PHONE_VERIFICATION);

      if (shouldCheckPhone && !user.isPhoneVerified) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'Phone verification is required to access this resource',
          [{ code: 'PHONE_NOT_VERIFIED', message: 'Please verify your phone number.' }],
        );
      }

      req.user = user;
      req.tokenPayload = payload;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Role-based authorization middleware.
 * Usage: router.get('/admin', authenticate(), authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), handler);
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' does not have permission to access this resource`,
        ),
      );
    }

    next();
  };
};

/**
 * Require verified email middleware.
 * If enforce is false (default), only enforces when env.AUTH_REQUIRE_EMAIL_VERIFICATION is enabled.
 * If enforce is true, strictly requires email verification regardless of the global env toggle.
 */
export const requireEmailVerified = (enforce = false) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const mustEnforce = enforce || env.AUTH_REQUIRE_EMAIL_VERIFICATION;
    if (mustEnforce && !req.user.isEmailVerified) {
      return next(
        new ApiError(
          HttpStatus.FORBIDDEN,
          'Email verification is required for this action',
          [{ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address.' }],
        ),
      );
    }

    next();
  };
};

/**
 * Require verified phone middleware.
 * If enforce is false (default), only enforces when env.AUTH_REQUIRE_PHONE_VERIFICATION is enabled.
 * If enforce is true, strictly requires phone verification regardless of the global env toggle.
 */
export const requirePhoneVerified = (enforce = false) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const mustEnforce = enforce || env.AUTH_REQUIRE_PHONE_VERIFICATION;
    if (mustEnforce && !req.user.isPhoneVerified) {
      return next(
        new ApiError(
          HttpStatus.FORBIDDEN,
          'Phone verification is required for this action',
          [{ code: 'PHONE_NOT_VERIFIED', message: 'Please verify your phone number.' }],
        ),
      );
    }

    next();
  };
};

/**
 * Flexible combined verification check.
 * Usage: router.post('/checkout', authenticate(), requireVerified({ email: true, phone: true }), handler);
 */
export const requireVerified = (options: RequireVerifiedOptions = {}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const checkEmail =
      options.email === true ||
      (options.email !== false &&
        (options.enforce || env.AUTH_REQUIRE_EMAIL_VERIFICATION));

    const checkPhone =
      options.phone === true ||
      (options.phone !== false &&
        (options.enforce || env.AUTH_REQUIRE_PHONE_VERIFICATION));

    if (checkEmail && !req.user.isEmailVerified) {
      return next(
        new ApiError(
          HttpStatus.FORBIDDEN,
          'Email verification is required for this action',
          [{ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address.' }],
        ),
      );
    }

    if (checkPhone && !req.user.isPhoneVerified) {
      return next(
        new ApiError(
          HttpStatus.FORBIDDEN,
          'Phone verification is required for this action',
          [{ code: 'PHONE_NOT_VERIFIED', message: 'Please verify your phone number.' }],
        ),
      );
    }

    next();
  };
};

// Re-export RBAC middlewares for unified auth imports
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireOwnerOrPermission,
  type OwnerOrPermissionOptions,
} from './rbac.middleware';
