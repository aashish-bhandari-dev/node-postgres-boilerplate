import { JsonResource } from './base.resource';

export interface RoleResourceData {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  hierarchy: number;
  isSystem: boolean;
  rolePermissions?: Array<{
    permission?: { name: string; displayName?: string } | null;
  }>;
  permissions?: string[];
  _count?: {
    users?: number;
  };
  usersCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class RoleResource extends JsonResource<RoleResourceData> {
  toArray(): Record<string, unknown> {
    const permissions =
      this.resource.permissions ??
      this.resource.rolePermissions?.map((rp) => rp.permission?.name).filter(Boolean) ??
      [];

    return {
      id: this.resource.id,
      name: this.resource.name,
      displayName: this.resource.displayName,
      description: this.resource.description ?? null,
      hierarchy: this.resource.hierarchy,
      isSystem: this.resource.isSystem,
      permissions,
      usersCount: this.resource._count?.users ?? this.resource.usersCount ?? 0,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    };
  }
}
