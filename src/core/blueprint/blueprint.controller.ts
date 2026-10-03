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

      const {
        page,
        limit,
        searchTerm,
        sortBy,
        sortOrder,
        filter: rawFilter,
        ...flatQueryParams
      } = req.query;

      const nestedFilter =
        typeof rawFilter === 'object' && rawFilter !== null
          ? (rawFilter as Record<string, unknown>)
          : {};

      const combinedFilter: Record<string, unknown> = {
        ...flatQueryParams,
        ...nestedFilter,
      };

      const queryOptions: BlueprintQueryOptions = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        searchTerm: searchTerm ? String(searchTerm).trim() : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        filter: Object.keys(combinedFilter).length > 0 ? combinedFilter : undefined,
        baseUrl,
        user: req.user,
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
      const record = await this.service.getById(req.params.id, { user: req.user });
      ApiResponse.success(res, 'Record retrieved successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.service.create(req.body, { user: req.user });
      ApiResponse.created(res, 'Record created successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.service.update(req.params.id, req.body, {
        user: req.user,
      });
      ApiResponse.success(res, 'Record updated successfully', record);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(req.params.id, { user: req.user });
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
