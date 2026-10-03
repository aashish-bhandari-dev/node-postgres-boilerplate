import { Router, RequestHandler } from 'express';
import { BaseBlueprintController } from './blueprint.controller';
import { BlueprintConfig } from './types';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

export function createBlueprintRouter(
  config: BlueprintConfig,
  controller: BaseBlueprintController,
  extendRouter?: (router: Router) => void,
): Router {
  const router = Router();

  // Apply custom resource-level middlewares (e.g. auth check)
  if (config.middlewares?.length) {
    router.use(...config.middlewares);
  }

  // Base authentication middleware for permissions if enabled (defaults to true if permissions are set)
  const authMiddleware: RequestHandler[] =
    config.permissions && config.permissions.requireAuth !== false
      ? [authenticate()]
      : [];

  // Route-specific permission middlewares
  const listMiddlewares: RequestHandler[] = [];
  if (config.permissions?.list) {
    listMiddlewares.push(...authMiddleware, requirePermission(config.permissions.list));
  }

  const getMiddlewares: RequestHandler[] = [];
  if (config.permissions?.get) {
    getMiddlewares.push(...authMiddleware, requirePermission(config.permissions.get));
  }

  const createMiddlewares: RequestHandler[] = [];
  if (config.permissions?.create) {
    createMiddlewares.push(
      ...authMiddleware,
      requirePermission(config.permissions.create),
    );
  }
  if (config.validation?.create) {
    createMiddlewares.push(validateRequest(config.validation.create));
  }

  const updateMiddlewares: RequestHandler[] = [];
  if (config.permissions?.update) {
    updateMiddlewares.push(
      ...authMiddleware,
      requirePermission(config.permissions.update),
    );
  }
  if (config.validation?.update) {
    updateMiddlewares.push(validateRequest(config.validation.update));
  }

  const deleteMiddlewares: RequestHandler[] = [];
  if (config.permissions?.delete) {
    deleteMiddlewares.push(
      ...authMiddleware,
      requirePermission(config.permissions.delete),
    );
  }

  // Base Blueprint routes
  router
    .route('/')
    .get(...listMiddlewares, controller.getAll)
    .post(...createMiddlewares, controller.create);

  router
    .route('/:id')
    .get(...getMiddlewares, controller.getById)
    .put(...updateMiddlewares, controller.update)
    .patch(...updateMiddlewares, controller.update)
    .delete(...deleteMiddlewares, controller.delete);

  // Allow custom route extensions
  if (extendRouter) {
    extendRouter(router);
  }

  return router;
}

// Alias for backwards compatibility
export const createCrudRouter = createBlueprintRouter;
