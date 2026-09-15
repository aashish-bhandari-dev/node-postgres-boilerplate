import { registerUserPolicy } from './user.policy';

/**
 * Initializes all registered domain policies on application bootstrap.
 */
export function initializePolicies(): void {
  registerUserPolicy();
}

export * from './user.policy';
