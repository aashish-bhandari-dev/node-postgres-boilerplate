import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constants/roles';
import { ApiError } from '../utils/apiError';
import { PermissionString } from '../constants/permissions';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
} from '../utils/rbac.util';

/**
 * Middleware: Requires the authenticated user to hold a specific permission.
 * Usage: router.delete('/:id', authenticate(), requirePermission('users:delete'), handler);
 */
export const requirePermission = (permission: PermissionString) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!hasPermission(req.user, permission)) {
      return next(
        ApiError.forbidden(`Forbidden: Missing required permission '${permission}'`),
      );
    }

    next();
  };
};

/**
 * Middleware: Requires the authenticated user to hold AT LEAST ONE of the specified permissions.
 * Usage: router.get('/reports', authenticate(), requireAnyPermission('reports:read', 'admin:read'), handler);
 */
export const requireAnyPermission = (...permissions: PermissionString[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!hasAnyPermission(req.user, permissions)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Requires at least one of the following permissions: [${permissions.join(', ')}]`,
        ),
      );
    }

    next();
  };
};

/**
 * Middleware: Requires the authenticated user to hold ALL of the specified permissions.
 * Usage: router.post('/sensitive', authenticate(), requireAllPermissions('users:delete', 'audit:read'), handler);
 */
export const requireAllPermissions = (...permissions: PermissionString[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!hasAllPermissions(req.user, permissions)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Requires all of the following permissions: [${permissions.join(', ')}]`,
        ),
      );
    }

    next();
  };
};

/**
 * Middleware: Requires the authenticated user to hold a specific role (or higher in hierarchy by default).
 * Usage: router.get('/admin', authenticate(), requireRole(UserRole.ADMIN), handler);
 */
export const requireRole = (
  role: UserRole | string,
  options: { allowHigher?: boolean } = { allowHigher: true },
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!hasRole(req.user, role, options)) {
      const mode = options.allowHigher === false ? 'exact' : 'or higher';
      return next(
        ApiError.forbidden(
          `Forbidden: Requires '${role}' role (${mode}) to access this resource`,
        ),
      );
    }

    next();
  };
};

export interface OwnerOrPermissionOptions {
  /**
   * The administrative/override permission that bypasses the ownership check
   */
  permission: PermissionString;

  /**
   * Function to extract the owner's user ID from request parameters, body, or database
   */
  getOwnerId: (req: Request) => string | undefined | Promise<string | undefined>;
}

/**
 * Contextual Authorization Middleware:
 * Grants access if user holds the specified administrative permission OR if user is the resource owner.
 * Usage: router.patch('/users/:id', authenticate(), requireOwnerOrPermission({
 *   permission: 'users:update',
 *   getOwnerId: (req) => req.params.id,
 * }), handler);
 */
export const requireOwnerOrPermission = (options: OwnerOrPermissionOptions) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized('Authentication required'));
      }

      // 1. If user has admin/management permission, grant access immediately
      if (hasPermission(req.user, options.permission)) {
        return next();
      }

      // 2. Otherwise check ownership
      const ownerId = await options.getOwnerId(req);
      if (ownerId && req.user.id === ownerId) {
        return next();
      }

      return next(
        ApiError.forbidden(
          'Forbidden: You do not have permission to access or modify this resource',
        ),
      );
    } catch (error) {
      return next(error);
    }
  };
};
