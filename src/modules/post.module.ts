import { z } from 'zod';
import { defineModule } from '../core/crud';
import { PostResource } from '../resources/post.resource';

/**
 * Post Module
 *
 * Automatically generates:
 * - GET    /api/posts       (list with pagination, search, filter, sort)
 * - GET    /api/posts/:id   (get single post with author)
 * - POST   /api/posts       (create post with Zod validation)
 * - PATCH  /api/posts/:id   (update post with Zod validation)
 * - DELETE /api/posts/:id   (delete post by ID)
 *
 * Uses PostResource (Laravel-style) to format and shape JSON responses.
 */
export const postModule = defineModule({
  model: 'post',
  searchableFields: ['title', 'content'],
  filterFields: ['published', 'authorId'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  resource: PostResource,
  include: {
    author: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
  validation: {
    create: z.object({
      body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().optional(),
        published: z.boolean().optional().default(false),
        authorId: z.string().uuid('Author ID must be a valid UUID'),
      }),
    }),
    update: z.object({
      body: z.object({
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        published: z.boolean().optional(),
      }),
    }),
  },
});
