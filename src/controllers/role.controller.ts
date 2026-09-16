import { Request, Response, NextFunction } from 'express';
import { roleService } from '../services/role.service';
import { ApiResponse } from '../utils/apiResponse';

export class RoleController {
  /**
   * GET /api/roles
   * List all roles with pagination, search, and assigned permissions.
   */
  async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roleService.getAllRoles(req.query);
      ApiResponse.success(
        res,
        'Roles retrieved successfully',
        result.items,
        result.pagination as unknown as Record<string, unknown>,
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/roles/:id
   * Retrieve a single role by ID with its permissions.
   */
  async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roleService.getRoleById(req.params.id);
      ApiResponse.success(res, 'Role retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/roles
   * Create a new role.
   */
  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roleService.createRole(req.body);
      ApiResponse.created(res, 'Role created successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/roles/:id
   * Update an existing role.
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roleService.updateRole(req.params.id, req.body);
      ApiResponse.success(res, 'Role updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/roles/:id
   * Delete a custom role.
   */
  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roleService.deleteRole(req.params.id);
      ApiResponse.success(res, 'Role deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/roles/:id/permissions
   * Assign or sync permissions for a role.
   */
  async assignPermissions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await roleService.assignPermissions(
        req.params.id,
        req.body.permissions,
      );
      ApiResponse.success(res, 'Role permissions updated successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export const roleController = new RoleController();
