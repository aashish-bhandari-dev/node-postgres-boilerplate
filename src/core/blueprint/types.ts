import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject } from 'zod';
import { PermissionString } from '../../constants/permissions';
import { UserAuthContext } from '../../utils/rbac.util';

export interface BlueprintPermissionsConfig {
  /**
   * If true, applies authenticate() before permission checks. Defaults to true if permissions are configured.
   */
  requireAuth?: boolean;

  /**
   * Permission required for listing records (GET /)
   */
  list?: PermissionString;

  /**
   * Permission required for getting a single record (GET /:id)
   */
  get?: PermissionString;

  /**
   * Permission required for creating a record (POST /)
   */
  create?: PermissionString;

  /**
   * Permission required for updating a record (PUT /:id, PATCH /:id)
   */
  update?: PermissionString;

  /**
   * Permission required for deleting a record (DELETE /:id)
   */
  delete?: PermissionString;
}

export interface BlueprintPolicyConfig {
  /**
   * The subject name for ABAC policy evaluation (e.g. 'User', 'Article')
   */
  subject?: string;

  /**
   * Row-level security scope filter: dynamically injects query where-clause conditions based on user attributes.
   * e.g., (user) => (user?.role === 'USER' ? { authorId: user.id } : {})
   */
  scope?: (user?: UserAuthContext | null) => Record<string, unknown>;
}

export interface BlueprintQueryOptions {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
  baseUrl?: string;
  user?: UserAuthContext | null;
}

export interface BlueprintHooks<T = Record<string, unknown>> {
  beforeCreate?: (
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterCreate?: (result: T) => Promise<void> | void;
  beforeUpdate?: (
    id: string | number,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterUpdate?: (result: T) => Promise<void> | void;
  beforeDelete?: (id: string | number) => Promise<void> | void;
  afterDelete?: (result: T) => Promise<void> | void;
}

export interface BlueprintConfig<TModel = Record<string, unknown>> {
  /**
   * The Prisma client delegate name in lowercase, e.g. 'user', 'post', 'product'
   */
  model: string;

  /**
   * Endpoint path prefix, e.g. 'users', 'posts'. Defaults to `${model}s`
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
    list?: AnyZodObject;
    create?: AnyZodObject;
    update?: AnyZodObject;
  };

  /**
   * Middleware applied to all routes in this blueprint (e.g. auth, role check)
   */
  middlewares?: RequestHandler[];

  /**
   * Declarative RBAC permissions per CRUD action
   */
  permissions?: BlueprintPermissionsConfig;

  /**
   * Optional ABAC Policy and Row-Level Security configuration
   */
  policy?: BlueprintPolicyConfig;

  /**
   * Lifecycle hooks
   */
  hooks?: BlueprintHooks<TModel>;

  /**
   * Optional Laravel-style JsonResource class to format response data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource?: new (item: any) => { toArray(): Record<string, unknown> };

  /**
   * Optional custom transformation function for response data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform?: (data: any) => Record<string, unknown>;
}

export type BlueprintHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

// Aliases for backwards compatibility
export type CrudQueryOptions = BlueprintQueryOptions;
export type CrudHooks<T = Record<string, unknown>> = BlueprintHooks<T>;
export type CrudResourceConfig<TModel = Record<string, unknown>> =
  BlueprintConfig<TModel>;
export type CrudHandler = BlueprintHandler;
