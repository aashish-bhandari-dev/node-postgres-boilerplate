import { UserRole } from '@prisma/client';
import { definePolicy } from '../policy.registry';

export interface UserResourceEntity {
  id: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Standard ABAC Policy for User entity.
 * Demonstrates combining roles, attribute matching (ownership), and constraints.
 */
export function registerUserPolicy(): void {
  definePolicy<UserResourceEntity>('User', (builder) => {
    // 1. Super Admin and Admin can manage all users
    builder.can('manage', 'User').whenRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);

    // 2. Authenticated users can read users
    builder.can('read', 'User');

    // 3. Users can update their OWN profile (ABAC ownership)
    builder.can('update', 'User').when((user, targetUser) => {
      return !!targetUser && user.id === targetUser.id;
    });

    // 4. Managers can update regular users, but cannot update Admins
    builder
      .can('update', 'User')
      .whenRole(UserRole.MANAGER)
      .when((_user, targetUser) => {
        return !targetUser || targetUser.role === UserRole.USER;
      });

    // 5. Non-admins cannot delete user accounts
    builder.cannot('delete', 'User').whenRole(UserRole.USER, UserRole.MANAGER);
  });
}
