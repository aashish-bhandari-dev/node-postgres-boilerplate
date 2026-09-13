import { defineModule } from '../core/crud';
import { createUserSchema, updateUserSchema } from '../validations/user.validation';
import { UserResource } from '../resources/user.resource';

/**
 * User Module
 *
 * Automatically generates:
 * - GET    /api/users       (list with pagination, search, filter, sort)
 * - GET    /api/users/:id   (get single user by ID)
 * - POST   /api/users       (create user with Zod validation)
 * - PATCH  /api/users/:id   (update user with Zod validation)
 * - DELETE /api/users/:id   (delete user by ID)
 *
 * Uses UserResource (Laravel-style) to format and shape JSON responses.
 *
 * Overriding:
 * - Pass custom service (e.g. `service: new MyCustomService('user')`)
 * - Or hooks: `hooks: { beforeCreate: async (data) => ... }`
 * - Or extend router: `extendRouter: (router) => router.post('/...', ...)`
 */
export const userModule = defineModule({
  model: 'user',
  searchableFields: ['name', 'email'],
  filterFields: ['role', 'isActive'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  resource: UserResource,
  include: {
    _count: {
      select: { posts: true },
    },
  },
  validation: {
    create: createUserSchema,
    update: updateUserSchema,
  },
});
