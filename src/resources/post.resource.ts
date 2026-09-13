import { JsonResource } from './base.resource';

export interface PostResourceData {
  id: string;
  title: string;
  content?: string | null;
  published: boolean;
  authorId: string;
  author?: {
    id: string;
    name?: string | null;
    email: string;
  };
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * Laravel-style Post API Resource
 * Formats post responses and nested author relation.
 */
export class PostResource extends JsonResource<PostResourceData> {
  toArray(): Record<string, unknown> {
    return {
      id: this.resource.id,
      title: this.resource.title,
      content: this.resource.content ?? '',
      published: this.resource.published,
      author: this.resource.author
        ? {
            id: this.resource.author.id,
            name: this.resource.author.name ?? null,
            email: this.resource.author.email,
          }
        : null,
      createdAt: this.resource.createdAt,
    };
  }
}
