import { Router } from 'express';
import { BaseBlueprintService } from './blueprint.service';
import { BaseBlueprintController } from './blueprint.controller';
import { createBlueprintRouter } from './blueprint.router';
import { BlueprintConfig } from './types';

export interface Blueprint {
  model: string;
  path: string;
  config: CreateBlueprintOptions;
  service: BaseBlueprintService;
  controller: BaseBlueprintController;
  router: Router;
}

export interface CreateBlueprintOptions extends BlueprintConfig {
  /**
   * Optional custom service instance (if you want to override service methods)
   */
  service?: BaseBlueprintService;

  /**
   * Optional custom controller instance (if you want to override controller methods)
   */
  controller?: BaseBlueprintController;

  /**
   * Optional callback to attach custom routes (e.g. router.post('/publish', ...))
   */
  extendRouter?: (router: Router) => void;
}

export function createBlueprint(options: CreateBlueprintOptions): Blueprint {
  const model = options.model;
  // Default path is pluralized model name (e.g. 'post' -> 'posts', 'category' -> 'categories')
  const defaultPath = model.endsWith('y') ? `${model.slice(0, -1)}ies` : `${model}s`;
  const path = options.path || defaultPath;

  const service = options.service || new BaseBlueprintService(model, options);
  const controller = options.controller || new BaseBlueprintController(service);
  const router = createBlueprintRouter(options, controller, options.extendRouter);

  return {
    model,
    path,
    config: options,
    service,
    controller,
    router,
  };
}

export const defineBlueprint = createBlueprint;
export const defineModule = createBlueprint;
export const defineResource = createBlueprint;
export const createCrudResource = createBlueprint;

export type BlueprintModule = Blueprint;
export type CrudResource = Blueprint;
export type CrudModule = Blueprint;
export type CreateBlueprintModuleOptions = CreateBlueprintOptions;
export type CreateCrudResourceOptions = CreateBlueprintOptions;
