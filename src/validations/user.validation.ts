import { z } from 'zod';

const userRoleEnum = z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER']);
const authProviderEnum = z.enum(['LOCAL', 'GOOGLE', 'APPLE', 'GITHUB', 'FACEBOOK']);

export const createUserSchema = z.object({
  body: z.object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .min(1, 'First name is required'),
    lastName: z.string().optional(),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, and underscores')
      .optional(),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .optional(),
    phone: z.string().optional(),
    image: z.string().url('Invalid image URL').optional(),
    bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
    gender: z.string().optional(),
    dateOfBirth: z.coerce.date().optional(),
    locale: z.string().default('en').optional(),
    timezone: z.string().default('UTC').optional(),
    role: userRoleEnum.optional().default('CUSTOMER'),
    provider: authProviderEnum.optional().default('LOCAL'),
    providerId: z.string().optional(),
    isActive: z.boolean().optional().default(true),
    isDeactivated: z.boolean().optional().default(false),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z
    .object({
      firstName: z.string().min(1, 'First name cannot be empty').optional(),
      lastName: z.string().optional(),
      username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, and underscores')
        .optional(),
      email: z.string().email('Invalid email address').optional(),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      phone: z.string().optional(),
      image: z.string().url('Invalid image URL').optional(),
      bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
      gender: z.string().optional(),
      dateOfBirth: z.coerce.date().optional(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
      role: userRoleEnum.optional(),
      isActive: z.boolean().optional(),
      isDeactivated: z.boolean().optional(),
      isEmailVerified: z.boolean().optional(),
      isPhoneVerified: z.boolean().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    role: userRoleEnum.optional(),
    provider: authProviderEnum.optional(),
    isActive: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
    isEmailVerified: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>['query'];
