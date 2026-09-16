import { Router } from 'express';
import { permissionController } from '../controllers/permission.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  listPermissionsQuerySchema,
  updateUserPermissionsSchema,
  userIdParamSchema,
} from '../validations/permission.validation';
import { Permission } from '../constants/permissions';

const router = Router();

// Base authentication required for all permission endpoints
router.use(authenticate());

/**
 * @openapi
 * /api/permissions:
 *   get:
 *     summary: List all system permissions
 *     tags: [Permissions]
 *     parameters:
 *       - in: query
 *         name: grouped
 *         schema:
 *           type: boolean
 *         description: Group permissions by module
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by specific module
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword
 */
router.get(
  '/',
  requireAnyPermission(Permission.ROLES_READ, Permission.USERS_READ),
  validateRequest(listPermissionsQuerySchema),
  permissionController.listPermissions,
);

/**
 * @openapi
 * /api/permissions/roles:
 *   get:
 *     summary: Get default permission matrix for all system roles
 *     tags: [Permissions]
 */
router.get(
  '/roles',
  requirePermission(Permission.ROLES_READ),
  permissionController.getRoleMatrix,
);

/**
 * @openapi
 * /api/permissions/me:
 *   get:
 *     summary: Get effective permissions and UI capabilities for the current logged-in user
 *     tags: [Permissions]
 */
router.get('/me', permissionController.getMePermissions);

/**
 * @openapi
 * /api/permissions/users/:id:
 *   get:
 *     summary: Get effective permissions and overrides for a user
 *     tags: [Permissions]
 */
router.get(
  '/users/:id',
  requireAnyPermission(Permission.ROLES_READ, Permission.USERS_READ),
  validateRequest(userIdParamSchema),
  permissionController.getUserPermissions,
);

/**
 * @openapi
 * /api/permissions/users/:id:
 *   put:
 *     summary: Update an individual user's permissions
 *     tags: [Permissions]
 */
router.put(
  '/users/:id',
  requireAnyPermission(Permission.ROLES_ASSIGN, Permission.USERS_UPDATE),
  validateRequest(updateUserPermissionsSchema),
  permissionController.updateUserPermissions,
);

/**
 * @openapi
 * /api/permissions/users/:id/reset:
 *   post:
 *     summary: Reset an individual user's permissions to role defaults
 *     tags: [Permissions]
 */
router.post(
  '/users/:id/reset',
  requireAnyPermission(Permission.ROLES_ASSIGN, Permission.USERS_UPDATE),
  validateRequest(userIdParamSchema),
  permissionController.resetUserPermissions,
);

export default router;
