import { UserRole } from '../constants/roles';
import { prisma } from '../config/db';
import { ApiError } from '../utils/apiError';
import { SYSTEM_PERMISSIONS, PermissionDefinition } from '../constants/permissions';
import { RolePermissions } from '../constants/roles';
import {
  getUserPermissions,
  matchesPermission,
  UserAuthContext,
} from '../utils/rbac.util';
import { UpdateUserPermissionsInput } from '../validations/permission.validation';

export interface UserPermissionItemState extends PermissionDefinition {
  isInheritedFromRole: boolean;
  isOverridden: boolean;
  isGranted: boolean; // True if effective permission is active, False if unassigned or explicitly unchecked/denied
}

export interface UserPermissionsResponse {
  userId: string;
  role: UserRole | string;
  hasCustomPermissions: boolean;
  rolePermissions: string[];
  directPermissions: Array<{
    permission: string;
    displayName: string;
    isGranted: boolean;
  }>;
  effectivePermissions: string[];
  catalog: UserPermissionItemState[];
  groupedCatalog: Record<string, UserPermissionItemState[]>;
}

export interface GroupedPermissions {
  [module: string]: PermissionDefinition[];
}

export class PermissionService {
  private permissionCache: PermissionDefinition[] | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  /**
   * Clears the in-memory cache
   */
  public clearCache(): void {
    this.permissionCache = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Retrieve all registered permissions in the system.
   * Uses in-memory cache for high throughput, falls back to SYSTEM_PERMISSIONS if DB is unseeded.
   */
  async getAllPermissions(): Promise<PermissionDefinition[]> {
    const now = Date.now();
    if (this.permissionCache && now < this.cacheExpiresAt) {
      return this.permissionCache;
    }

    try {
      const records = await prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { name: 'asc' }],
      });

      if (Array.isArray(records) && records.length > 0) {
        this.permissionCache = records.map((r) => ({
          name: r.name,
          displayName: r.displayName,
          description: r.description ?? '',
          module: r.module,
          action: r.action,
        }));
        this.cacheExpiresAt = now + this.CACHE_TTL_MS;
        return this.permissionCache;
      }
    } catch {
      // Fall back if DB table isn't migrated yet or query fails
    }

    // Fall back to constants
    return [...SYSTEM_PERMISSIONS];
  }

  /**
   * Group a list of permissions by module/resource for frontend display (e.g. accordion/tabs).
   */
  groupPermissionsByModule(permissions: PermissionDefinition[]): GroupedPermissions {
    const grouped: GroupedPermissions = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }
    return grouped;
  }

  /**
   * Returns default permissions for every role in the system.
   */
  async getRolePermissionsMatrix(): Promise<Record<string, string[]>> {
    // Start with static defaults for standard roles
    const matrix: Record<string, string[]> = {};
    for (const [roleName, perms] of Object.entries(RolePermissions)) {
      matrix[roleName] = [...perms];
    }

    try {
      const dbRoles = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      if (Array.isArray(dbRoles) && dbRoles.length > 0) {
        for (const role of dbRoles) {
          const permNames = role.rolePermissions
            .map((rp) => rp.permission?.name)
            .filter(Boolean) as string[];
          matrix[role.name] = permNames;
        }
      }
    } catch {
      // Fall back to compile-time RolePermissions
    }

    return matrix;
  }

  /**
   * Retrieve effective permissions, direct overrides, and UI-ready checkbox catalog for a user.
   */
  async getUserEffectivePermissions(userId: string): Promise<UserPermissionsResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw ApiError.notFound(`User with ID '${userId}' not found`);
    }

    const roleName =
      typeof (user as any).role === 'object' && (user as any).role !== null
        ? (user as any).role.name
        : ((user as any).role ?? 'USER');
    const roleMatrix = await this.getRolePermissionsMatrix();
    const rolePermissions = roleMatrix[roleName] ?? [];

    const directPermissions = (user.userPermissions || []).map((up) => ({
      permission: up.permission.name,
      displayName: up.permission.displayName,
      isGranted: up.isGranted,
    }));

    // Calculate effective permissions using RBAC utility
    const authContext: UserAuthContext = {
      id: user.id,
      role: roleName,
      roleId: user.roleId,
      rolePermissions,
      hasCustomPermissions: user.hasCustomPermissions,
      userPermissions: (user.userPermissions || []).map((up) => ({
        isGranted: up.isGranted,
        permissionName: up.permission.name,
      })),
      metadata: user.metadata,
    };

    const effectivePermissions = getUserPermissions(authContext);

    // Build enriched permissions catalog for UI checkboxes/toggles
    const allPermissions = await this.getAllPermissions();
    const directMap = new Map<string, boolean>();
    for (const up of user.userPermissions || []) {
      if (up.permission?.name) {
        directMap.set(up.permission.name, up.isGranted);
      }
    }

    const catalog: UserPermissionItemState[] = allPermissions.map((p) => {
      const isInheritedFromRole = rolePermissions.some((rp) =>
        matchesPermission(rp, p.name),
      );
      const isOverridden = directMap.has(p.name);
      const isGranted = isOverridden ? directMap.get(p.name)! : isInheritedFromRole;

      return {
        name: p.name,
        displayName: p.displayName,
        description: p.description,
        module: p.module,
        action: p.action,
        isInheritedFromRole,
        isOverridden,
        isGranted,
      };
    });

    const groupedCatalog: Record<string, UserPermissionItemState[]> = {};
    for (const item of catalog) {
      if (!groupedCatalog[item.module]) {
        groupedCatalog[item.module] = [];
      }
      groupedCatalog[item.module].push(item);
    }

    return {
      userId: user.id,
      role: roleName,
      hasCustomPermissions: user.hasCustomPermissions,
      rolePermissions,
      directPermissions,
      effectivePermissions,
      catalog,
      groupedCatalog,
    };
  }

  /**
   * Update permissions for an individual user.
   * Supports:
   * 1. `permissions`: desired list of permissions (e.g. ['users:read']) -> automatically computes ALLOW/DENY
   * 2. `overrides`: explicit list of { permission, isGranted }
   * 3. `resetToDefault`: wipe all custom overrides and revert to role default
   */
  async updateUserPermissions(
    userId: string,
    input: UpdateUserPermissionsInput,
  ): Promise<UserPermissionsResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.deletedAt) {
      throw ApiError.notFound(`User with ID '${userId}' not found`);
    }

    // 1. Handle reset to role default
    if (input.resetToDefault) {
      return this.resetUserPermissions(userId);
    }

    // 2. Fetch all permission records from database to map name -> id
    const dbPermissions = await prisma.permission.findMany();
    const permissionMap = new Map<string, string>(); // name -> id
    for (const p of dbPermissions) {
      permissionMap.set(p.name, p.id);
    }

    const roleMatrix = await this.getRolePermissionsMatrix();
    const roleName =
      typeof (user as any).role === 'object' && (user as any).role !== null
        ? (user as any).role.name
        : ((user as any).role ?? 'USER');
    const rolePerms = roleMatrix[roleName] ?? [];

    // 3. Process desired permission list if provided (UI checkbox matrix submit)
    if (input.permissions !== undefined) {
      const desiredSet = new Set(input.permissions);

      // Verify all requested permissions exist, auto-create from SYSTEM_PERMISSIONS if needed
      for (const p of desiredSet) {
        if (!permissionMap.has(p)) {
          const sysDef = SYSTEM_PERMISSIONS.find((sp) => sp.name === p);
          if (sysDef) {
            try {
              const created = await prisma.permission.upsert({
                where: { name: sysDef.name },
                update: {},
                create: {
                  name: sysDef.name,
                  displayName: sysDef.displayName,
                  description: sysDef.description,
                  module: sysDef.module,
                  action: sysDef.action,
                },
              });
              permissionMap.set(
                created?.name ?? sysDef.name,
                created?.id ?? `perm-${sysDef.name}`,
              );
            } catch {
              permissionMap.set(sysDef.name, `perm-${sysDef.name}`);
            }
          } else {
            throw ApiError.badRequest(`Unknown permission '${p}'`);
          }
        }
      }

      const allCatalog = await this.getAllPermissions();
      const toDeny: string[] = [];
      const toGrant: string[] = [];

      for (const p of allCatalog) {
        const isInherited = rolePerms.some((rp) => matchesPermission(rp, p.name));
        const isDesired = desiredSet.has(p.name);

        if (isInherited && !isDesired) {
          // Granted by role, but unchecked by admin -> Explicit DENY
          toDeny.push(p.name);
        } else if (!isInherited && isDesired) {
          // Not granted by role, but checked by admin -> Explicit GRANT
          toGrant.push(p.name);
        }
      }

      // Check if desired permissions match role defaults exactly
      if (toDeny.length === 0 && toGrant.length === 0) {
        return this.resetUserPermissions(userId);
      }

      // Perform update atomically in transaction
      await prisma.$transaction(async (tx) => {
        // Clear existing custom permissions
        await tx.userPermission.deleteMany({
          where: { userId },
        });

        // Insert denied permissions (isGranted: false)
        for (const p of toDeny) {
          const permId = permissionMap.get(p);
          if (permId) {
            await tx.userPermission.create({
              data: {
                userId,
                permissionId: permId,
                isGranted: false,
              },
            });
          }
        }

        // Insert extra granted permissions (isGranted: true)
        for (const p of toGrant) {
          const permId = permissionMap.get(p);
          if (permId) {
            await tx.userPermission.create({
              data: {
                userId,
                permissionId: permId,
                isGranted: true,
              },
            });
          }
        }

        // Mark user as having custom permissions
        await tx.user.update({
          where: { id: userId },
          data: { hasCustomPermissions: true },
        });
      });

      this.clearCache();
      return this.getUserEffectivePermissions(userId);
    }

    // 4. Process explicit overrides if provided
    if (input.overrides !== undefined) {
      // Validate all permission names exist
      for (const override of input.overrides) {
        if (!permissionMap.has(override.permission)) {
          const sysDef = SYSTEM_PERMISSIONS.find((sp) => sp.name === override.permission);
          if (sysDef) {
            try {
              const created = await prisma.permission.upsert({
                where: { name: sysDef.name },
                update: {},
                create: {
                  name: sysDef.name,
                  displayName: sysDef.displayName,
                  description: sysDef.description,
                  module: sysDef.module,
                  action: sysDef.action,
                },
              });
              permissionMap.set(
                created?.name ?? sysDef.name,
                created?.id ?? `perm-${sysDef.name}`,
              );
            } catch {
              permissionMap.set(sysDef.name, `perm-${sysDef.name}`);
            }
          } else {
            throw ApiError.badRequest(`Unknown permission '${override.permission}'`);
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const override of input.overrides!) {
          const permId = permissionMap.get(override.permission)!;
          await tx.userPermission.upsert({
            where: {
              userId_permissionId: {
                userId,
                permissionId: permId,
              },
            },
            create: {
              userId,
              permissionId: permId,
              isGranted: override.isGranted,
            },
            update: {
              isGranted: override.isGranted,
            },
          });
        }

        const totalUserPermissions = await tx.userPermission.count({
          where: { userId },
        });

        await tx.user.update({
          where: { id: userId },
          data: { hasCustomPermissions: totalUserPermissions > 0 },
        });
      });

      this.clearCache();
      return this.getUserEffectivePermissions(userId);
    }

    return this.getUserEffectivePermissions(userId);
  }

  /**
   * Reset an individual user's permissions back to their default role permissions.
   */
  async resetUserPermissions(userId: string): Promise<UserPermissionsResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw ApiError.notFound(`User with ID '${userId}' not found`);
    }

    await prisma.$transaction([
      prisma.userPermission.deleteMany({
        where: { userId },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { hasCustomPermissions: false },
      }),
    ]);

    this.clearCache();
    return this.getUserEffectivePermissions(userId);
  }

  /**
   * Spatie Laravel-style: Grant a specific permission directly to a user.
   */
  async givePermissionTo(
    userId: string,
    permissionName: string,
  ): Promise<UserPermissionsResponse> {
    return this.updateUserPermissions(userId, {
      overrides: [{ permission: permissionName, isGranted: true }],
    });
  }

  /**
   * Spatie Laravel-style: Revoke / uncheck a specific permission from a user.
   * If inherited from role, creates explicit DENY override (isGranted: false).
   */
  async revokePermissionTo(
    userId: string,
    permissionName: string,
  ): Promise<UserPermissionsResponse> {
    return this.updateUserPermissions(userId, {
      overrides: [{ permission: permissionName, isGranted: false }],
    });
  }

  /**
   * Spatie Laravel-style: Sync all user permissions to match the specified desired list.
   * Diffs against role default and removes overrides if identical.
   */
  async syncPermissions(
    userId: string,
    permissionNames: string[],
  ): Promise<UserPermissionsResponse> {
    return this.updateUserPermissions(userId, {
      permissions: permissionNames,
    });
  }
}

export const permissionService = new PermissionService();
