import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission, requireAnyPermission } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  listRolesQuerySchema,
  assignRolePermissionsSchema,
} from '../validations/role.validation';
import { Permission } from '../constants/permissions';

const router = Router();

// All role endpoints require authentication
router.use(authenticate());

/**
 * @openapi
 * /api/roles:
 *   get:
 *     summary: List all roles
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 */
router.get(
  '/',
  requirePermission(Permission.ROLES_READ),
  validateRequest(listRolesQuerySchema),
  roleController.listRoles,
);

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     summary: Get role details by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 */
router.get(
  '/:id',
  requirePermission(Permission.ROLES_READ),
  validateRequest(roleIdParamSchema),
  roleController.getRoleById,
);

/**
 * @openapi
 * /api/roles:
 *   post:
 *     summary: Create a new custom role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *             properties:
 *               name:
 *                 type: string
 *                 example: SUPPORT_AGENT
 *               displayName:
 *                 type: string
 *                 example: Support Agent
 *               description:
 *                 type: string
 *                 example: Handles customer support and inquiries
 *               hierarchy:
 *                 type: integer
 *                 default: 10
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["users:read", "audit:read"]
 *     responses:
 *       201:
 *         description: Role created successfully
 *       409:
 *         description: Role name already exists
 */
router.post(
  '/',
  requireAnyPermission(Permission.ROLES_CREATE, Permission.ROLES_MANAGE),
  validateRequest(createRoleSchema),
  roleController.createRole,
);

/**
 * @openapi
 * /api/roles/{id}:
 *   patch:
 *     summary: Update an existing role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               hierarchy:
 *                 type: integer
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Cannot rename system role
 *       404:
 *         description: Role not found
 */
router.patch(
  '/:id',
  requireAnyPermission(Permission.ROLES_UPDATE, Permission.ROLES_MANAGE),
  validateRequest(updateRoleSchema),
  roleController.updateRole,
);

/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a custom role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Cannot delete system role or role with assigned users
 *       404:
 *         description: Role not found
 */
router.delete(
  '/:id',
  requireAnyPermission(Permission.ROLES_DELETE, Permission.ROLES_MANAGE),
  validateRequest(roleIdParamSchema),
  roleController.deleteRole,
);

/**
 * @openapi
 * /api/roles/{id}/permissions:
 *   put:
 *     summary: Assign or sync permissions for a role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["users:read", "settings:read"]
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 */
router.put(
  '/:id/permissions',
  requireAnyPermission(Permission.ROLES_ASSIGN, Permission.ROLES_MANAGE),
  validateRequest(assignRolePermissionsSchema),
  roleController.assignPermissions,
);

export default router;
