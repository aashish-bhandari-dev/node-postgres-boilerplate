import { Request, Response, NextFunction } from 'express';
import { AccessAction, AccessSubject, AccessContext } from '../types/abac.types';
import { can } from '../core/policy/policy.engine';
import { ApiError } from '../utils/apiError';

export interface PolicyMiddlewareOptions<TResource = Record<string, unknown>> {
  /**
   * Asynchronously loads the target entity from database based on request params/body.
   */
  loadResource?: (req: Request) => Promise<TResource | null | undefined>;

  /**
   * Synchronously extracts resource attributes from request (e.g. from req.body or params).
   */
  getResource?: (req: Request) => TResource | undefined;

  /**
   * Custom context extractor for environmental attributes (IP, geolocation, time, headers).
   */
  getContext?: (req: Request) => AccessContext;

  /**
   * Custom error message if access is denied.
   */
  errorMessage?: string;
}

/**
 * Express Middleware: Enforces unified RBAC + ABAC policy.
 *
 * Example:
 * router.patch(
 *   '/articles/:id',
 *   authenticate(),
 *   requirePolicy('update', 'Article', {
 *     loadResource: (req) => prisma.article.findUnique({ where: { id: req.params.id } }),
 *   }),
 *   controller.update,
 * );
 */
export const requirePolicy = <TResource = Record<string, unknown>>(
  action: AccessAction,
  subject: AccessSubject,
  options?: PolicyMiddlewareOptions<TResource>,
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(ApiError.unauthorized('Authentication required'));
      }

      let resource: TResource | undefined;

      // 1. Resolve resource if loader or extractor provided
      if (options?.loadResource) {
        const loaded = await options.loadResource(req);
        if (!loaded) {
          return next(ApiError.notFound(`${subject} not found`));
        }
        resource = loaded;
      } else if (options?.getResource) {
        resource = options.getResource(req);
      }

      // 2. Assemble context attributes
      const baseContext: AccessContext = {
        ip: req.ip,
        userAgent: typeof req.get === 'function' ? req.get('user-agent') : undefined,
        timestamp: new Date(),
        params: req.params,
        query: req.query,
      };

      const context = options?.getContext
        ? { ...baseContext, ...options.getContext(req) }
        : baseContext;

      // 3. Evaluate unified policy
      const allowed = await can(req.user, action, subject, { resource, context });

      if (!allowed) {
        return next(
          ApiError.forbidden(
            options?.errorMessage ||
              `Forbidden: You do not have permission to ${action} this ${subject}`,
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
