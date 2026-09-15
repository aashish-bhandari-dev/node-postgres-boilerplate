import { UserRole } from '@prisma/client';
import {
  AccessAction,
  AccessSubject,
  AttributeCondition,
  PolicyRule,
} from '../../types/abac.types';
import { PermissionString } from '../../constants/permissions';

/**
 * Fluent builder for configuring conditions on a specific policy rule.
 */
export class RuleBuilder<TResource = Record<string, unknown>> {
  constructor(private readonly rule: PolicyRule<TResource>) {}

  /**
   * Defines dynamic attribute condition: (user, resource, context) => boolean
   */
  when(condition: AttributeCondition<TResource>): this {
    this.rule.condition = condition;
    return this;
  }

  /**
   * Restricts rule to specific user roles.
   */
  whenRole(...roles: UserRole[]): this {
    this.rule.roles = roles;
    return this;
  }

  /**
   * Requires a specific RBAC permission.
   */
  whenPermission(permission: PermissionString): this {
    this.rule.permission = permission;
    return this;
  }

  /**
   * Human-readable rationale for denial or auditing.
   */
  because(reason: string): this {
    this.rule.reason = reason;
    return this;
  }
}

/**
 * Policy Builder for an individual subject/resource.
 */
export class PolicyBuilder<TResource = Record<string, unknown>> {
  public readonly rules: PolicyRule<TResource>[] = [];

  constructor(public readonly defaultSubject: AccessSubject) {}

  /**
   * Allows an action on this subject.
   */
  can(
    action: AccessAction,
    subject: AccessSubject = this.defaultSubject,
  ): RuleBuilder<TResource> {
    const rule: PolicyRule<TResource> = {
      action,
      subject,
      inverted: false,
    };
    this.rules.push(rule);
    return new RuleBuilder<TResource>(rule);
  }

  /**
   * Explicitly denies an action on this subject (takes precedence over allow rules).
   */
  cannot(
    action: AccessAction,
    subject: AccessSubject = this.defaultSubject,
  ): RuleBuilder<TResource> {
    const rule: PolicyRule<TResource> = {
      action,
      subject,
      inverted: true,
    };
    this.rules.push(rule);
    return new RuleBuilder<TResource>(rule);
  }
}

/**
 * Global registry storing compiled ABAC policies by subject.
 */
export class PolicyRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static readonly policies = new Map<string, PolicyRule<any>[]>();

  /**
   * Register a policy for a subject.
   */
  static definePolicy<TResource = Record<string, unknown>>(
    subject: AccessSubject,
    definition: (builder: PolicyBuilder<TResource>) => void,
  ): void {
    const builder = new PolicyBuilder<TResource>(subject);
    definition(builder);

    const existing = this.policies.get(subject) || [];
    this.policies.set(subject, [...existing, ...builder.rules]);
  }

  /**
   * Retrieve all rules for a given subject (including global 'all' rules).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getRules(subject: AccessSubject): PolicyRule<any>[] {
    const subjectRules = this.policies.get(subject) || [];
    const globalRules = subject !== 'all' ? this.policies.get('all') || [] : [];
    return [...globalRules, ...subjectRules];
  }

  /**
   * Clears registered policies (useful in test isolation).
   */
  static clear(): void {
    this.policies.clear();
  }
}

/**
 * Helper shorthand to define a policy.
 */
export const definePolicy = PolicyRegistry.definePolicy.bind(PolicyRegistry);
