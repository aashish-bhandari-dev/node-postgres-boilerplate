import { Request, Response, NextFunction } from 'express';
import { BaseCrudService, BaseCrudController, createCrudResource } from '../../core/crud';
import { createUserSchema, updateUserSchema } from '../../validations/user.validation';
import { ApiError } from '../../utils/apiError';
import { ApiResponse } from '../../utils/apiResponse';

/**
 * Custom Service Overriding Base Methods
 *
 * Here you can overwrite any method: getAll, getById, create, update, delete
 * or use lifecycle hooks: beforeCreate, afterCreate, etc.
 */
export class CustomUserCrudService extends BaseCrudService {
  /**
   * Example of overwriting beforeCreate hook:
   * Normalizes email address to lowercase and trims whitespace
   */
  override async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const email = typeof data.email === 'string' ? data.email.toLowerCase().trim() : data.email;
    return {
      ...data,
      email,
    };
  }

  /**
   * Example of overwriting delete method:
   * Prevents deletion of the main system admin account
   */
  override async delete(id: string) {
    const user = (await this.getById(id)) as { email?: string };
    if (user.email === 'admin@example.com') {
      throw ApiError.forbidden('The default system administrator cannot be deleted');
    }
    return super.delete(id);
  }
}

/**
 * Custom Controller Overriding / Extending Base Controller Actions
 */
export class CustomUserCrudController extends BaseCrudController<CustomUserCrudService> {
  /**
   * Custom action: Toggle user active state
   */
  async toggleActiveStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (await this.service.getById(req.params.id)) as { isActive: boolean };
      const updated = await this.service.update(req.params.id, {
        isActive: !user.isActive,
      });
      const isActive = (updated as { isActive?: boolean }).isActive;
      ApiResponse.success(
        res,
        `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        updated,
      );
    } catch (error) {
      next(error);
    }
  }
}

const customUserService = new CustomUserCrudService('user');
const customUserController = new CustomUserCrudController(customUserService);

/**
 * Auto-CRUD Resource for 'User' Model with Custom Overrides
 */
export const userAdminResource = createCrudResource({
  model: 'user',
  path: 'users',
  service: customUserService,
  controller: customUserController,
  searchableFields: ['name', 'email'],
  filterFields: ['role', 'isActive'],
  defaultSort: {
    field: 'createdAt',
    order: 'desc',
  },
  include: {
    _count: {
      select: { posts: true },
    },
  },
  validation: {
    create: createUserSchema,
    update: updateUserSchema,
  },
  // Extend router with custom endpoints
  extendRouter: (router) => {
    router.patch(
      '/:id/toggle-status',
      customUserController.toggleActiveStatus.bind(customUserController),
    );
  },
});
