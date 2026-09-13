import { z } from 'zod';
import { createCrudResource } from '../../core/crud';

/**
 * Auto-CRUD Resource for 'Post' Model
 *
 * Automatically generates:
 * - GET    /api/v1/admin/posts       (paginated list with search and sorting)
 * - GET    /api/v1/admin/posts/:id   (get single post with author)
 * - POST   /api/v1/admin/posts       (validated create)
 * - PATCH  /api/v1/admin/posts/:id   (validated update)
 * - DELETE /api/v1/admin/posts/:id   (delete post)
 */
export const postAdminResource = createCrudResource({
  model: 'post',
  path: 'posts',
  searchableFields: ['title', 'content'],
  filterFields: ['published', 'authorId'],
  defaultSort: {
    field: 'createdAt',
    order: 'desc',
  },
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
