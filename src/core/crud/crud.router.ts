import { Router, RequestHandler } from 'express';
import { BaseCrudController } from './crud.controller';
import { CrudResourceConfig } from './types';
import { validateRequest } from '../../middlewares/validate.middleware';

export function createCrudRouter(
  config: CrudResourceConfig,
  controller: BaseCrudController,
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

  // Base CRUD routes
  router.route('/')
    .get(controller.getAll)
    .post(...createMiddlewares, controller.create);

  router.route('/:id')
    .get(controller.getById)
    .patch(...updateMiddlewares, controller.update)
    .delete(controller.delete);

  // Allow custom route extensions
  if (extendRouter) {
    extendRouter(router);
  }

  return router;
}
