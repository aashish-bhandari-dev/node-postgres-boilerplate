import { UserRole, RoleHierarchy } from '../../../constants/roles';
import { definePolicy } from '../policy.registry';
import { hasPermission, isRoleAtLeast } from '../../../utils/rbac.util';

export interface UserResourceEntity {
  id: string;
  role?: string | { name?: string; hierarchy?: number };
  roleHierarchy?: number;
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

      const userRoleName =
        typeof user.role === 'object' && user.role !== null
          ? user.role.name
          : String(user.role ?? '');

      const targetRoleName =
        typeof targetUser.role === 'object' && targetUser.role !== null
          ? targetUser.role.name ?? ''
          : String(targetUser.role ?? '');

      // ABAC constraint: Non-SuperAdmin cannot edit or demote a SUPER_ADMIN
      if (
        targetRoleName === UserRole.SUPER_ADMIN &&
        userRoleName !== UserRole.SUPER_ADMIN
      ) {
        return false;
      }

      // Role hierarchy enforcement: User cannot update another user who has equal or higher hierarchy,
      // unless user is SUPER_ADMIN
      if (userRoleName !== UserRole.SUPER_ADMIN) {
        const userHierarchy =
          user.roleHierarchy ??
          RoleHierarchy[userRoleName] ??
          0;

        const targetHierarchy =
          targetUser.roleHierarchy ??
          (typeof targetUser.role === 'object' && targetUser.role !== null
            ? targetUser.role.hierarchy
            : undefined) ??
          RoleHierarchy[targetRoleName] ??
          0;

        // An updater must have strictly greater hierarchy than the target user being updated
        if (userHierarchy <= targetHierarchy) {
          return false;
        }
      }

      return true;
    });

    // 4. Delete user accounts:
    // Requires users:delete permission, cannot delete oneself, cannot delete SUPER_ADMIN,
    // and must have ADMIN or higher privileges (hierarchy >= 80)
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

      const targetRoleName =
        typeof targetUser.role === 'object' && targetUser.role !== null
          ? targetUser.role.name ?? ''
          : String(targetUser.role ?? '');

      // ABAC constraint: Cannot delete a SUPER_ADMIN
      if (targetRoleName === UserRole.SUPER_ADMIN) {
        return false;
      }

      const userRoleName =
        typeof user.role === 'object' && user.role !== null
          ? user.role.name
          : String(user.role ?? '');

      // Only ADMIN and SUPER_ADMIN (or roles with hierarchy >= ADMIN level 80) can delete users
      const hasAdminLevel = isRoleAtLeast(userRoleName, UserRole.ADMIN, {
        currentHierarchy: user.roleHierarchy,
      });

      return hasAdminLevel;
    });

    // 5. Explicit deny: Non-admins cannot delete user accounts
    builder.cannot('delete', 'User').when((user) => {
      const userRoleName =
        typeof user.role === 'object' && user.role !== null
          ? user.role.name
          : String(user.role ?? '');

      const hasAdminLevel = isRoleAtLeast(userRoleName, UserRole.ADMIN, {
        currentHierarchy: user.roleHierarchy,
      });

      return !hasAdminLevel;
    });
  });
}
