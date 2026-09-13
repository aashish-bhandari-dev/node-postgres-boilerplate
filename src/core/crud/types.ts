import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject } from 'zod';

export interface CrudQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
}

export interface CrudHooks<T = Record<string, unknown>> {
  beforeCreate?: (data: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterCreate?: (result: T) => Promise<void> | void;
  beforeUpdate?: (id: string | number, data: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterUpdate?: (result: T) => Promise<void> | void;
  beforeDelete?: (id: string | number) => Promise<void> | void;
  afterDelete?: (result: T) => Promise<void> | void;
}

export interface CrudResourceConfig<TModel = Record<string, unknown>> {
  /**
   * The Prisma client delegate name in lowercase, e.g. 'user', 'post', 'product'
   */
  model: string;

  /**
   * Endpoint path prefix under /admin, e.g. 'users', 'posts'. Defaults to `${model}s`
   */
  path?: string;

  /**
   * Fields on the model that can be searched using case-insensitive LIKE / contains
   */
  searchableFields?: string[];

  /**
   * Fields allowed for exact filtering in query parameters
   */
  filterFields?: string[];

  /**
   * Default sorting if not specified in query
   */
  defaultSort?: {
    field: string;
    order: 'asc' | 'desc';
  };

  /**
   * Optional Prisma include object applied to queries
   */
  include?: Record<string, unknown>;

  /**
   * Optional Prisma select object applied to queries
   */
  select?: Record<string, unknown>;

  /**
   * Optional Zod validation schemas for create/update
   */
  validation?: {
    create?: AnyZodObject;
    update?: AnyZodObject;
  };

  /**
   * Middleware applied to all routes in this CRUD resource (e.g. auth, role check)
   */
  middlewares?: RequestHandler[];

  /**
   * Lifecycle hooks
   */
  hooks?: CrudHooks<TModel>;
}

export type CrudHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
