import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiError';
import { PaginatedResult } from '../../types';
import { BlueprintQueryOptions, BlueprintConfig } from './types';

interface GenericPrismaDelegate {
  count(args?: Record<string, unknown>): Promise<number>;
  findMany(args?: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
}

export class BaseBlueprintService<TModel = Record<string, unknown>> {
  protected readonly modelName: string;
  protected readonly config: BlueprintConfig<TModel>;

  constructor(modelName: string, config: BlueprintConfig<TModel> = { model: modelName }) {
    this.modelName = modelName;
    this.config = config;
  }

  /**
   * Retrieves the dynamic Prisma delegate for this model
   */
  protected get delegate(): GenericPrismaDelegate {
    const delegate = (prisma as unknown as Record<string, GenericPrismaDelegate>)[this.modelName];
    if (!delegate) {
      throw ApiError.internal(`Prisma delegate for model '${this.modelName}' was not found`);
    }
    return delegate;
  }

  /**
   * Parse ID whether it is a UUID string or integer
   */
  protected parseId(id: string): string | number {
    if (/^\d+$/.test(id)) {
      return parseInt(id, 10);
    }
    return id;
  }

  /**
   * Hook executed before creation. Can modify or validate payload.
   */
  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.config.hooks?.beforeCreate) {
      return this.config.hooks.beforeCreate(data);
    }
    return data;
  }

  /**
   * Hook executed after creation.
   */
  async afterCreate(result: TModel): Promise<void> {
    if (this.config.hooks?.afterCreate) {
      await this.config.hooks.afterCreate(result);
    }
  }

  /**
   * Hook executed before update.
   */
  async beforeUpdate(
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (this.config.hooks?.beforeUpdate) {
      return this.config.hooks.beforeUpdate(id, data);
    }
    return data;
  }

  /**
   * Hook executed after update.
   */
  async afterUpdate(result: TModel): Promise<void> {
    if (this.config.hooks?.afterUpdate) {
      await this.config.hooks.afterUpdate(result);
    }
  }

  /**
   * Hook executed before delete.
   */
  async beforeDelete(id: string | number): Promise<void> {
    if (this.config.hooks?.beforeDelete) {
      await this.config.hooks.beforeDelete(id);
    }
  }

  /**
   * Hook executed after delete.
   */
  async afterDelete(result: TModel): Promise<void> {
    if (this.config.hooks?.afterDelete) {
      await this.config.hooks.afterDelete(result);
    }
  }

  /**
   * Apply Laravel-style JsonResource or custom transform if configured
   */
  protected transformItem(item: unknown): unknown {
    if (!item) return item;
    if (this.config.resource) {
      return new this.config.resource(item).toArray();
    }
    if (this.config.transform) {
      return this.config.transform(item);
    }
    return item;
  }

  /**
   * List records with pagination, search, filter, and sorting
   */
  async getAll(options: BlueprintQueryOptions = {}): Promise<PaginatedResult<TModel>> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Search functionality across configured fields
    if (options.search && this.config.searchableFields?.length) {
      where.OR = this.config.searchableFields.map((field) => ({
        [field]: { contains: options.search, mode: 'insensitive' },
      }));
    }

    // Exact match filters
    if (options.filter && typeof options.filter === 'object') {
      const allowedFilters = this.config.filterFields;
      for (const [key, value] of Object.entries(options.filter)) {
        if (!allowedFilters || allowedFilters.includes(key)) {
          if (value !== undefined && value !== '') {
            where[key] = value;
          }
        }
      }
    }

    // Sorting
    const sortBy = options.sortBy || this.config.defaultSort?.field || 'createdAt';
    const sortOrder = options.sortOrder || this.config.defaultSort?.order || 'desc';
    const orderBy = { [sortBy]: sortOrder };

    const queryArgs: Record<string, unknown> = {
      where,
      skip,
      take: limit,
      orderBy,
    };

    if (this.config.include) {
      queryArgs.include = this.config.include;
    } else if (this.config.select) {
      queryArgs.select = this.config.select;
    }

    const [total, items] = await Promise.all([
      this.delegate.count({ where }),
      this.delegate.findMany(queryArgs),
    ]);

    const totalPages = Math.ceil(total / limit);
    const transformedItems = items.map((item) => this.transformItem(item)) as TModel[];

    return {
      items: transformedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get single record by ID
   */
  async getById(rawId: string): Promise<TModel> {
    const id = this.parseId(rawId);
    const queryArgs: Record<string, unknown> = {
      where: { id },
    };

    if (this.config.include) {
      queryArgs.include = this.config.include;
    } else if (this.config.select) {
      queryArgs.select = this.config.select;
    }

    const record = await this.delegate.findUnique(queryArgs);
    if (!record) {
      throw ApiError.notFound(`${this.modelName} with ID '${rawId}' not found`);
    }

    return this.transformItem(record) as TModel;
  }

  /**
   * Create a new record
   */
  async create(data: Record<string, unknown>): Promise<TModel> {
    const processedData = await this.beforeCreate(data);

    const queryArgs: Record<string, unknown> = {
      data: processedData,
    };

    if (this.config.include) {
      queryArgs.include = this.config.include;
    } else if (this.config.select) {
      queryArgs.select = this.config.select;
    }

    const created = await this.delegate.create(queryArgs);
    await this.afterCreate(created as TModel);

    return this.transformItem(created) as TModel;
  }

  /**
   * Update an existing record
   */
  async update(rawId: string, data: Record<string, unknown>): Promise<TModel> {
    const id = this.parseId(rawId);
    // Ensure record exists
    await this.getById(rawId);

    const processedData = await this.beforeUpdate(id, data);

    const queryArgs: Record<string, unknown> = {
      where: { id },
      data: processedData,
    };

    if (this.config.include) {
      queryArgs.include = this.config.include;
    } else if (this.config.select) {
      queryArgs.select = this.config.select;
    }

    const updated = await this.delegate.update(queryArgs);
    await this.afterUpdate(updated as TModel);

    return this.transformItem(updated) as TModel;
  }

  /**
   * Delete an existing record
   */
  async delete(rawId: string): Promise<TModel> {
    const id = this.parseId(rawId);
    // Ensure record exists
    const record = await this.getById(rawId);

    await this.beforeDelete(id);

    const deleted = await this.delegate.delete({
      where: { id },
    });

    await this.afterDelete(record);

    return deleted as TModel;
  }
}

// Alias for backwards compatibility
export const BaseCrudService = BaseBlueprintService;
export type BaseCrudService<TModel = Record<string, unknown>> = BaseBlueprintService<TModel>;
