import { JsonResource } from './base.resource';

export interface UserResourceData {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  _count?: { posts?: number };
  posts?: unknown[];
}

/**
 * Laravel-style User API Resource
 * Formats user responses, hides sensitive fields, and shapes the JSON response.
 */
export class UserResource extends JsonResource<UserResourceData> {
  toArray(): Record<string, unknown> {
    return {
      id: this.resource.id,
      email: this.resource.email,
      name: this.resource.name ?? null,
      role: this.resource.role,
      isActive: this.resource.isActive,
      postsCount: this.resource._count?.posts ?? this.resource.posts?.length ?? 0,
      createdAt: this.resource.createdAt,
    };
  }
}
