import { UserAuthContext, hasPermission } from '../../utils/rbac.util';
import { Permission } from '../../constants/permissions';
import { AccessAction, AccessSubject, CanOptions } from '../../types/abac.types';
import { PolicyRegistry } from './policy.registry';
import { ApiError } from '../../utils/apiError';

/**
 * Normalizes action comparison (e.g. 'manage' or '*' covers all actions).
 */
function actionMatches(ruleAction: string, requestedAction: string): boolean {
  if (ruleAction === '*' || ruleAction === 'manage') {
    return true;
  }
  return ruleAction.toLowerCase() === requestedAction.toLowerCase();
}

/**
 * Evaluates whether a user can perform an action on a subject, combining RBAC and ABAC.
 *
 * Evaluation Order:
 * 1. Unauthenticated users are immediately denied.
 * 2. Master Wildcard (SUPER_ADMIN with '*') is immediately granted.
 * 3. Explicit "cannot" (deny) rules are evaluated. If any match, access is denied.
 * 4. Policy rules in the registry are evaluated (roles, permissions, and dynamic attribute conditions).
 * 5. Fallback to standard RBAC permission namespace: e.g. `${subject}s:${action}` or `${subject}:${action}`.
 */
export async function can<TResource = Record<string, unknown>>(
  user: UserAuthContext | null | undefined,
  action: AccessAction,
  subject: AccessSubject,
  options: CanOptions<TResource> | TResource = {},
): Promise<boolean> {
  if (!user || !user.role) {
    return false;
  }

  // 1. RBAC Master Wildcard: Super admins bypass all restrictions
  if (hasPermission(user, Permission.ALL)) {
    return true;
  }

  // Normalize options: allow passing resource directly or as { resource, context }
  const isResourceDirect =
    options &&
    typeof options === 'object' &&
    !('resource' in options) &&
    !('context' in options);

  const resource = (
    isResourceDirect ? options : (options as CanOptions<TResource>).resource
  ) as TResource | undefined;

  const context = isResourceDirect
    ? undefined
    : (options as CanOptions<TResource>).context;

  const rules = PolicyRegistry.getRules(subject);

  // 2. Check explicit deny ("cannot") rules
  for (const rule of rules) {
    if (!rule.inverted) continue;
    if (!actionMatches(rule.action, action)) continue;

    // Role check if rule specifies roles
    if (rule.roles && !rule.roles.includes(user.role as never)) {
      continue;
    }

    // Permission check if rule specifies permission
    if (rule.permission && !hasPermission(user, rule.permission)) {
      continue;
    }

    // Evaluate dynamic attribute condition
    if (rule.condition) {
      const conditionResult = await rule.condition(user, resource, context);
      if (conditionResult) {
        return false; // Explicitly denied
      }
    } else {
      return false; // Blanket deny rule
    }
  }

  // 3. Evaluate allow ("can") policy rules
  let hasMatchingActionRule = false;

  for (const rule of rules) {
    if (rule.inverted) continue;
    if (!actionMatches(rule.action, action)) continue;

    hasMatchingActionRule = true;

    // Role check
    if (rule.roles && !rule.roles.includes(user.role as never)) {
      continue;
    }

    // Permission check
    if (rule.permission && !hasPermission(user, rule.permission)) {
      continue;
    }

    // Dynamic attribute condition check (ABAC)
    if (rule.condition) {
      const conditionResult = await rule.condition(user, resource, context);
      if (conditionResult) {
        return true;
      }
    } else {
      // Unconditional allow rule in policy
      return true;
    }
  }

  // If the policy explicitly registered rules for this action and none granted access, deny!
  if (hasMatchingActionRule) {
    return false;
  }

  // 4. Fallback to standard RBAC namespace only if no policy rules exist for this action or subject
  const pluralSubject = `${subject.toLowerCase()}s`;
  const singularSubject = subject.toLowerCase();

  const rbacCandidates = [
    `${pluralSubject}:${action}`,
    `${singularSubject}:${action}`,
    `${pluralSubject}:*`,
    `${singularSubject}:*`,
  ];

  for (const candidate of rbacCandidates) {
    if (hasPermission(user, candidate as never)) {
      return true;
    }
  }

  return false;
}

/**
 * Inverse helper: checks if user CANNOT perform an action.
 */
export async function cannot<TResource = Record<string, unknown>>(
  user: UserAuthContext | null | undefined,
  action: AccessAction,
  subject: AccessSubject,
  options?: CanOptions<TResource> | TResource,
): Promise<boolean> {
  return !(await can(user, action, subject, options));
}

/**
 * Asserts that the user is allowed to perform the action. Throws 403 ApiError if forbidden.
 */
export async function authorizePolicy<TResource = Record<string, unknown>>(
  user: UserAuthContext | null | undefined,
  action: AccessAction,
  subject: AccessSubject,
  options?: CanOptions<TResource> | TResource,
): Promise<void> {
  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const allowed = await can(user, action, subject, options);
  if (!allowed) {
    throw ApiError.forbidden(
      `Forbidden: You do not have permission to ${action} this ${subject}`,
    );
  }
}
