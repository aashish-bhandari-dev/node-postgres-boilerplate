import { prisma } from '../config/db';
import { ApiError } from '../utils/apiError';
import { PaginatedResult } from '../types';
import { RoleResource } from '../resources/role.resource';
import {
  CreateRoleInput,
  UpdateRoleInput,
  ListRolesQuery,
} from '../validations/role.validation';
import { SYSTEM_PERMISSIONS } from '../constants/permissions';
import { permissionService } from './permission.service';

export class RoleService {
  /**
   * List roles with pagination, search, assigned permissions, and user counts.
   */
  async getAllRoles(query: Partial<ListRolesQuery> = {}): Promise<PaginatedResult<Record<string, unknown>>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.searchTerm) {
      where.OR = [
        { name: { contains: query.searchTerm, mode: 'insensitive' } },
        { displayName: { contains: query.searchTerm, mode: 'insensitive' } },
        { description: { contains: query.searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, roles] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ hierarchy: 'desc' }, { name: 'asc' }],
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 || skip >= total ? 0 : skip + 1;
    const to = total === 0 || skip >= total ? 0 : Math.min(total, skip + roles.length);

    const items = roles.map((r) => new RoleResource(r).toArray());

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        from,
        to,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1 && (totalPages === 0 || page <= totalPages + 1),
        nextPageUrl: page < totalPages ? `/api/roles?page=${page + 1}&limit=${limit}` : null,
        prevPageUrl: page > 1 ? `/api/roles?page=${page - 1}&limit=${limit}` : null,
      },
    };
  }

  /**
   * Retrieve a single role by ID.
   */
  async getRoleById(id: string): Promise<Record<string, unknown>> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw ApiError.notFound(`Role with ID '${id}' not found`);
    }

    return new RoleResource(role).toArray();
  }

  /**
   * Retrieve a single role by its unique name (e.g. 'ADMIN', 'USER').
   */
  async getRoleByName(name: string): Promise<Record<string, unknown> | null> {
    const role = await prisma.role.findUnique({
      where: { name: name.toUpperCase().trim() },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return null;
    }

    return new RoleResource(role).toArray();
  }

  /**
   * Create a new role with optional initial permissions.
   */
  async createRole(input: CreateRoleInput): Promise<Record<string, unknown>> {
    const normalizedName = input.name.toUpperCase().trim();

    const existing = await prisma.role.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      throw ApiError.conflict(`Role with name '${normalizedName}' already exists`);
    }

    // Resolve permission IDs from requested permission names
    const permissionIds = await this.resolvePermissionIds(input.permissions);

    const createdRole = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: normalizedName,
          displayName: input.displayName.trim(),
          description: input.description?.trim() ?? null,
          hierarchy: input.hierarchy ?? 10,
          isSystem: false,
        },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      });
    });

    if (!createdRole) {
      throw ApiError.internal('Failed to create role');
    }

    permissionService.clearCache();

    return new RoleResource(createdRole).toArray();
  }

  /**
   * Update an existing role.
   */
  async updateRole(id: string, input: UpdateRoleInput): Promise<Record<string, unknown>> {
    const existing = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: true,
      },
    });

    if (!existing) {
      throw ApiError.notFound(`Role with ID '${id}' not found`);
    }

    // Protect system role name
    if (existing.isSystem && input.name && input.name !== existing.name) {
      throw ApiError.badRequest(`Cannot rename system role '${existing.name}'`);
    }

    // Check unique name if changing
    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.role.findUnique({
        where: { name: input.name },
      });
      if (duplicate) {
        throw ApiError.conflict(`Role with name '${input.name}' already exists`);
      }
    }

    const permissionIds =
      input.permissions !== undefined
        ? await this.resolvePermissionIds(input.permissions)
        : null;

    const updatedRole = await prisma.$transaction(async (tx) => {
      // Sync permissions if provided
      if (permissionIds !== null) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }

      await tx.role.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.hierarchy !== undefined && { hierarchy: input.hierarchy }),
        },
      });

      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      });
    });

    if (!updatedRole) {
      throw ApiError.internal('Failed to update role');
    }

    permissionService.clearCache();

    return new RoleResource(updatedRole).toArray();
  }

  /**
   * Delete a custom role.
   * System roles cannot be deleted, and roles currently assigned to users cannot be deleted.
   */
  async deleteRole(id: string): Promise<Record<string, unknown>> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw ApiError.notFound(`Role with ID '${id}' not found`);
    }

    if (role.isSystem) {
      throw ApiError.badRequest(`System role '${role.name}' cannot be deleted`);
    }

    const usersCount = role._count?.users ?? 0;
    if (usersCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete role '${role.name}' because ${usersCount} user(s) are currently assigned to it. Reassign users to another role first.`,
      );
    }

    const deleted = await prisma.role.delete({
      where: { id },
    });

    permissionService.clearCache();

    return new RoleResource(deleted).toArray();
  }

  /**
   * Assign or sync permissions for a role.
   */
  async assignPermissions(
    roleId: string,
    permissionNames: string[],
  ): Promise<Record<string, unknown>> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw ApiError.notFound(`Role with ID '${roleId}' not found`);
    }

    const permissionIds = await this.resolvePermissionIds(permissionNames);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      });
    });

    if (!updated) {
      throw ApiError.internal('Failed to assign permissions to role');
    }

    permissionService.clearCache();

    return new RoleResource(updated).toArray();
  }

  /**
   * Helper: Resolves permission names to their database UUID IDs.
   * Auto-creates any standard SYSTEM_PERMISSIONS if missing from DB.
   */
  private async resolvePermissionIds(permissionNames?: string[]): Promise<string[]> {
    if (!permissionNames || permissionNames.length === 0) {
      return [];
    }

    const dbPermissions = await prisma.permission.findMany();
    const map = new Map<string, string>(); // name -> id
    for (const p of dbPermissions) {
      map.set(p.name, p.id);
    }

    const resolvedIds: string[] = [];

    for (const name of permissionNames) {
      let permId = map.get(name);
      if (!permId) {
        const sysDef = SYSTEM_PERMISSIONS.find((sp) => sp.name === name);
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
            permId = created.id;
            map.set(created.name, created.id);
          } catch {
            // In case of parallel inserts or mock environments
          }
        }
      }

      if (!permId) {
        throw ApiError.badRequest(`Unknown permission '${name}'`);
      }

      resolvedIds.push(permId);
    }

    return Array.from(new Set(resolvedIds));
  }
}

export const roleService = new RoleService();
