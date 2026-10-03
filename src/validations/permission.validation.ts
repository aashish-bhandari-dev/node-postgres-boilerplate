import { z } from 'zod';

export const listPermissionsQuerySchema = z.object({
  query: z.object({
    grouped: z.preprocess(
      (val) => val === 'true' || val === true,
      z.boolean().optional().default(false),
    ),
    module: z.string().optional(),
    searchTerm: z.string().optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export const updateUserPermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z
    .object({
      /**
       * Full desired list of permission strings (e.g. ['users:read']).
       * When provided, backend calculates role difference and creates appropriate ALLOW / DENY overrides.
       */
      permissions: z.array(z.string().min(1)).optional(),

      /**
       * Granular explicit overrides (e.g. [{ permission: 'users:update', isGranted: false }]).
       */
      overrides: z
        .array(
          z.object({
            permission: z.string().min(1, 'Permission name is required'),
            isGranted: z.boolean({ required_error: 'isGranted flag is required' }),
          }),
        )
        .optional(),

      /**
       * Set to true to wipe all custom user permissions and revert to role defaults.
       */
      resetToDefault: z.boolean().optional(),
    })
    .refine(
      (data) =>
        data.permissions !== undefined ||
        data.overrides !== undefined ||
        data.resetToDefault !== undefined,
      {
        message: 'Must provide either permissions, overrides, or resetToDefault',
      },
    ),
});

export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>['query'];
export type UpdateUserPermissionsInput = z.infer<
  typeof updateUserPermissionsSchema
>['body'];
