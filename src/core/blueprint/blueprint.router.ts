import { Router, RequestHandler } from 'express';
import { BaseBlueprintController } from './blueprint.controller';
import { BlueprintConfig } from './types';
import { validateRequest } from '../../middlewares/validate.middleware';

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

  // Create validation middlewares if schemas are provided
  const createMiddlewares: RequestHandler[] = [];
  if (config.validation?.create) {
    createMiddlewares.push(validateRequest(config.validation.create));
  }

  const updateMiddlewares: RequestHandler[] = [];
  if (config.validation?.update) {
    updateMiddlewares.push(validateRequest(config.validation.update));
  }

  // Base Blueprint routes
  router
    .route('/')
    .get(controller.getAll)
    .post(...createMiddlewares, controller.create);

  router
    .route('/:id')
    .get(controller.getById)
    .patch(...updateMiddlewares, controller.update)
    .delete(controller.delete);

  // Allow custom route extensions
  if (extendRouter) {
    extendRouter(router);
  }

  return router;
}

// Alias for backwards compatibility
export const createCrudRouter = createBlueprintRouter;
