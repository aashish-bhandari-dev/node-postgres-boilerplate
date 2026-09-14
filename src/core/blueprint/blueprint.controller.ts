import { Request, Response, NextFunction } from 'express';
import { BaseBlueprintService } from './blueprint.service';
import { ApiResponse } from '../../utils/apiResponse';
import { BlueprintQueryOptions } from './types';

export class BaseBlueprintController<
  TService extends BaseBlueprintService = BaseBlueprintService,
> {
  protected readonly service: TService;

  constructor(service: TService) {
    this.service = service;

    // Auto-bind methods to preserve 'this'
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const host = req.get('host');
      const baseUrl = host
        ? `${req.protocol}://${host}${req.originalUrl}`
        : req.originalUrl;

      const queryOptions: BlueprintQueryOptions = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        filter: req.query.filter as Record<string, unknown> | undefined,
        baseUrl,
      };

      const result = await this.service.getAll(queryOptions);
      ApiResponse.success(
        res,
        'Records retrieved successfully',
        result.items,
        result.pagination,
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.service.getById(req.params.id);
      ApiResponse.success(res, 'Record retrieved successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.service.create(req.body);
      ApiResponse.created(res, 'Record created successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.service.update(req.params.id, req.body);
      ApiResponse.success(res, 'Record updated successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(req.params.id);
      ApiResponse.success(res, 'Record deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Alias for backwards compatibility
export const BaseCrudController = BaseBlueprintController;
export type BaseCrudController<
  TService extends BaseBlueprintService = BaseBlueprintService,
> = BaseBlueprintController<TService>;
