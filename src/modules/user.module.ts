import { defineModule } from '../core/crud';
import { createUserSchema, updateUserSchema } from '../validations/user.validation';
import { UserResource } from '../resources/user.resource';

/**
 * User Module
 *
 * Automatically generates:
 * - GET    /api/users       (list with pagination, search across names/email/phone/username, filter, sort)
 * - GET    /api/users/:id   (get single user by ID)
 * - POST   /api/users       (create user with Zod validation)
 * - PATCH  /api/users/:id   (update user with Zod validation)
 * - DELETE /api/users/:id   (delete user by ID)
 *
 * Automatically transforms responses via UserResource to strip passwords and security tokens.
 */
export const userModule = defineModule({
  model: 'user',
  searchableFields: ['firstName', 'lastName', 'username', 'email', 'phone'],
  filterFields: ['role', 'provider', 'isActive', 'isEmailVerified', 'isDeactivated'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  resource: UserResource,
  validation: {
    create: createUserSchema,
    update: updateUserSchema,
  },
});
