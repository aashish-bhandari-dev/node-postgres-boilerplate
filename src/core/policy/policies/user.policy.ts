import { UserRole } from '../../../constants/roles';
import { definePolicy } from '../policy.registry';
import { hasPermission } from '../../../utils/rbac.util';

export interface UserResourceEntity {
  id: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Standard ABAC Policy for User entity.
 * Synergizes RBAC permissions (users:update, users:delete, users:read) with dynamic
 * attribute matching (self-ownership, role hierarchy protection, Super Admin guard).
 */
export function registerUserPolicy(): void {
  definePolicy<UserResourceEntity>('User', (builder) => {
    // 1. Authenticated users with users:read permission can view users
    builder.can('read', 'User').when((user) => hasPermission(user, 'users:read'));

    // 2. Users can update their OWN profile (ABAC self-ownership)
    builder.can('update', 'User').when((user, targetUser) => {
      return !!targetUser && user.id === targetUser.id;
    });

    // 3. Administrative update of other users:
    // Requires users:update permission, AND enforces role hierarchy
    builder.can('update', 'User').when((user, targetUser) => {
      // Must hold active permission to update users (denied if unchecked for this admin)
      const canUpdate = hasPermission(user, 'users:update');
      if (!canUpdate) {
        return false;
      }

      // If no specific target resource provided, general permission check passed
      if (!targetUser) {
        return true;
      }

      // ABAC constraint: Non-SuperAdmin cannot edit or demote a SUPER_ADMIN
      if (
        targetUser.role === UserRole.SUPER_ADMIN &&
        user.role !== UserRole.SUPER_ADMIN
      ) {
        return false;
      }

      // ABAC constraint: Managers can only update regular USERs
      if (user.role === UserRole.MANAGER) {
        return targetUser.role === UserRole.USER;
      }

      return true;
    });

    // 4. Delete user accounts:
    // Requires users:delete permission, cannot delete oneself, cannot delete SUPER_ADMIN
    builder.can('delete', 'User').when((user, targetUser) => {
      const canDelete = hasPermission(user, 'users:delete');
      if (!canDelete) {
        return false;
      }

      if (!targetUser) {
        return true;
      }

      // ABAC constraint: Cannot delete yourself (prevent lockout)
      if (user.id === targetUser.id) {
        return false;
      }

      // ABAC constraint: Cannot delete a SUPER_ADMIN
      if (targetUser.role === UserRole.SUPER_ADMIN) {
        return false;
      }

      // Only ADMIN and SUPER_ADMIN can delete users
      return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    });

    // 5. Explicit deny: Non-admins cannot delete user accounts
    builder.cannot('delete', 'User').whenRole(UserRole.USER, UserRole.MANAGER);
  });
}
