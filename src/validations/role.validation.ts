import { z } from 'zod';

export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Role name is required' })
      .min(2, 'Role name must be at least 2 characters')
      .max(50, 'Role name cannot exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Role name can only contain alphanumeric characters, underscores, and hyphens',
      )
      .transform((val) => val.trim().toUpperCase()),
    displayName: z
      .string({ required_error: 'Display name is required' })
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name cannot exceed 100 characters')
      .transform((val) => val.trim()),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    hierarchy: z.coerce.number().int().min(0).max(1000).default(10).optional(),
    permissions: z.array(z.string()).optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID format'),
  }),
  body: z
    .object({
      name: z
        .string()
        .min(2, 'Role name must be at least 2 characters')
        .max(50, 'Role name cannot exceed 50 characters')
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          'Role name can only contain alphanumeric characters, underscores, and hyphens',
        )
        .transform((val) => val.trim().toUpperCase())
        .optional(),
      displayName: z
        .string()
        .min(2, 'Display name must be at least 2 characters')
        .max(100, 'Display name cannot exceed 100 characters')
        .transform((val) => val.trim())
        .optional(),
      description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
      hierarchy: z.coerce.number().int().min(0).max(1000).optional(),
      permissions: z.array(z.string()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const roleIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID format'),
  }),
});

export const listRolesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
  }),
});

export const assignRolePermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID format'),
  }),
  body: z.object({
    permissions: z.array(z.string(), {
      required_error: 'Permissions array is required',
    }),
  }),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body'];
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>['query'];
export type AssignRolePermissionsInput = z.infer<typeof assignRolePermissionsSchema>['body'];
