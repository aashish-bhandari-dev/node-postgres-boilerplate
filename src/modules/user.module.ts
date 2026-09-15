import { defineBlueprint } from '../core/blueprint';
import { createUserSchema, updateUserSchema } from '../validations/user.validation';
import { UserResource } from '../resources/user.resource';
import { Permission } from '../constants/permissions';

/**
 * User Module
 *
 * Automatically generates:
 * - GET    /api/users       (list with pagination, search across names/email/phone/username, filter, sort) [Protected: users:read]
 * - GET    /api/users/:id   (get single user by ID) [Protected: users:read]
 * - POST   /api/users       (create user with Zod validation) [Protected: users:create]
 * - PATCH  /api/users/:id   (update user with Zod validation) [Protected: users:update]
 * - DELETE /api/users/:id   (delete user by ID) [Protected: users:delete]
 *
 * Automatically transforms responses via UserResource to strip passwords and security tokens.
 */
export const userModule = defineBlueprint({
  model: 'user',
  searchableFields: ['firstName', 'lastName', 'username', 'email', 'phone'],
  filterFields: ['role', 'provider', 'isActive', 'isEmailVerified', 'isDeactivated'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  resource: UserResource,
  permissions: {
    list: Permission.USERS_READ,
    get: Permission.USERS_READ,
    create: Permission.USERS_CREATE,
    update: Permission.USERS_UPDATE,
    delete: Permission.USERS_DELETE,
  },
  validation: {
    create: createUserSchema,
    update: updateUserSchema,
  },
});
