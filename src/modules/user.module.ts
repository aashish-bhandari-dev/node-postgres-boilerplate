import { defineBlueprint } from '../core/blueprint';
import { createUserSchema, updateUserSchema } from '../validations/user.validation';
import { UserResource } from '../resources/user.resource';
import { Permission } from '../constants/permissions';
import { permissionController } from '../controllers/permission.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAnyPermission } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  updateUserPermissionsSchema,
  userIdParamSchema,
} from '../validations/permission.validation';

/**
 * User Module
 *
 * Automatically generates:
 * - GET    /api/users                 (list with pagination, search across names/email/phone/username, filter, sort) [Protected: users:read]
 * - GET    /api/users/:id             (get single user by ID) [Protected: users:read]
 * - POST   /api/users                 (create user with Zod validation) [Protected: users:create]
 * - PATCH  /api/users/:id             (update user with Zod validation) [Protected: users:update]
 * - DELETE /api/users/:id             (delete user by ID) [Protected: users:delete]
 *
 * Extended Routes:
 * - GET    /api/users/:id/permissions (get user effective permissions, role defaults, direct overrides)
 * - PUT    /api/users/:id/permissions (set user custom permissions / overrides)
 * - POST   /api/users/:id/permissions/reset (reset user permissions back to role defaults)
 *
 * Automatically transforms responses via UserResource to strip passwords and security tokens.
 */
export const userModule = defineBlueprint({
  model: 'user',
  searchableFields: ['firstName', 'lastName', 'username', 'email', 'phone'],
  filterFields: ['roleId', 'provider', 'isActive', 'isEmailVerified', 'isDeactivated'],
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
  policy: {
    subject: 'User',
  },
  extendRouter: (router) => {
    router.get(
      '/:id/permissions',
      authenticate(),
      requireAnyPermission(Permission.ROLES_READ, Permission.USERS_READ),
      validateRequest(userIdParamSchema),
      permissionController.getUserPermissions,
    );

    router.put(
      '/:id/permissions',
      authenticate(),
      requireAnyPermission(Permission.ROLES_ASSIGN, Permission.USERS_UPDATE),
      validateRequest(updateUserPermissionsSchema),
      permissionController.updateUserPermissions,
    );

    router.post(
      '/:id/permissions/reset',
      authenticate(),
      requireAnyPermission(Permission.ROLES_ASSIGN, Permission.USERS_UPDATE),
      validateRequest(userIdParamSchema),
      permissionController.resetUserPermissions,
    );
  },
});
