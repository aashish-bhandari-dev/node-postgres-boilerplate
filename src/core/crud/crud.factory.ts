import { Router } from 'express';
import { BaseCrudService } from './crud.service';
import { BaseCrudController } from './crud.controller';
import { createCrudRouter } from './crud.router';
import { CrudResourceConfig } from './types';

export interface CrudResource {
  model: string;
  path: string;
  service: BaseCrudService;
  controller: BaseCrudController;
  router: Router;
}

export interface CreateCrudResourceOptions extends CrudResourceConfig {
  /**
   * Optional custom service instance (if you want to override service methods)
   */
  service?: BaseCrudService;

  /**
   * Optional custom controller instance (if you want to override controller methods)
   */
  controller?: BaseCrudController;

  /**
   * Optional callback to attach custom routes (e.g. router.post('/publish', ...))
   */
  extendRouter?: (router: Router) => void;
}

export function createCrudResource(options: CreateCrudResourceOptions): CrudResource {
  const model = options.model;
  // Default path is pluralized model name (e.g. 'post' -> 'posts', 'category' -> 'categories')
  const defaultPath = model.endsWith('y') ? `${model.slice(0, -1)}ies` : `${model}s`;
  const path = options.path || defaultPath;

  const service = options.service || new BaseCrudService(model, options);
  const controller = options.controller || new BaseCrudController(service);
  const router = createCrudRouter(options, controller, options.extendRouter);

  return {
    model,
    path,
    service,
    controller,
    router,
  };
}

export const defineResource = createCrudResource;
export const defineModule = createCrudResource;
export const defineCrud = createCrudResource;

export type CrudModule = CrudResource;
export type CreateCrudModuleOptions = CreateCrudResourceOptions;


