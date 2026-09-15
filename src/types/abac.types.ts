import { UserRole } from '@prisma/client';
import { UserAuthContext } from '../utils/rbac.util';
import { PermissionString } from '../constants/permissions';

/**
 * Common access actions.
 */
export type StandardAction = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'list';

export type AccessAction = StandardAction | (string & {});

/**
 * Subject or entity name being accessed (e.g. 'User', 'Article', 'Comment', 'all').
 */
export type AccessSubject = 'all' | (string & {});

/**
 * Environmental or request context passed into ABAC rule evaluation.
 */
export interface AccessContext {
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Dynamic condition function evaluating user attributes, resource attributes, and context.
 */
export type AttributeCondition<TResource = Record<string, unknown>> = (
  user: UserAuthContext,
  resource?: TResource,
  context?: AccessContext,
) => boolean | Promise<boolean>;

/**
 * Represents a single compiled authorization rule.
 */
export interface PolicyRule<TResource = Record<string, unknown>> {
  action: AccessAction;
  subject: AccessSubject;
  inverted?: boolean; // If true, this is a "cannot" (deny) rule
  condition?: AttributeCondition<TResource>;
  roles?: UserRole[];
  permission?: PermissionString;
  reason?: string;
}

/**
 * Options for policy authorization checks.
 */
export interface CanOptions<TResource = Record<string, unknown>> {
  resource?: TResource;
  context?: AccessContext;
}
