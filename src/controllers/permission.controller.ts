import { Request, Response, NextFunction } from 'express';
import { permissionService } from '../services/permission.service';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export class PermissionController {
  /**
   * GET /api/permissions/me
   * Retrieve effective permissions and UI capabilities for the authenticated user
   */
  async getMePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw ApiError.unauthorized();
      }
      const result = await permissionService.getUserEffectivePermissions(req.user.id);
      ApiResponse.success(res, 'Current user permissions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/permissions
   * List all system permissions with metadata (supports ?grouped=true, ?module=..., ?search=...)
   */
  async listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isGrouped = String(req.query.grouped) === 'true';
      const moduleFilter = req.query.module as string | undefined;
      const search = (req.query.search as string | undefined)?.toLowerCase();

      let permissions = await permissionService.getAllPermissions();

      if (moduleFilter) {
        permissions = permissions.filter(
          (p) => p.module.toLowerCase() === moduleFilter.toLowerCase(),
        );
      }

      if (search) {
        permissions = permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.displayName.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search),
        );
      }

      if (isGrouped) {
        const grouped = permissionService.groupPermissionsByModule(permissions);
        ApiResponse.success(res, 'Grouped permissions retrieved successfully', grouped);
        return;
      }

      ApiResponse.success(res, 'Permissions catalog retrieved successfully', permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/permissions/roles
   * Return default permission matrix for all system roles
   */
  async getRoleMatrix(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const matrix = await permissionService.getRolePermissionsMatrix();
      ApiResponse.success(res, 'Role permission matrix retrieved successfully', matrix);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id/permissions
   * Get role permissions, direct overrides, and effective permissions for a user
   */
  async getUserPermissions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await permissionService.getUserEffectivePermissions(req.params.id);
      ApiResponse.success(res, 'User permissions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/:id/permissions
   * Update permissions for an individual user (desired list or overrides)
   */
  async updateUserPermissions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await permissionService.updateUserPermissions(
        req.params.id,
        req.body,
      );
      ApiResponse.success(res, 'User permissions updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/:id/permissions/reset
   * Reset user's custom permissions back to default role permissions
   */
  async resetUserPermissions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await permissionService.resetUserPermissions(req.params.id);
      ApiResponse.success(
        res,
        'User permissions reset to role default successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }
}

export const permissionController = new PermissionController();
