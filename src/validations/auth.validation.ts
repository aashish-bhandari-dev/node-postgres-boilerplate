import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .min(1, 'First name cannot be empty'),
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
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    locale: z.string().default('en').optional(),
    timezone: z.string().default('UTC').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z
      .string({ required_error: 'Identifier (email, username, or phone) is required' })
      .min(1, 'Identifier is required'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .min(1, 'Refresh token is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: 'Verification token is required' })
      .min(1, 'Verification token is required'),
  }),
});

export const resendVerificationEmailSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
  }),
});

export const sendPhoneOtpSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .min(5, 'Phone number must be at least 5 digits'),
  }),
});

export const verifyPhoneSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .min(5, 'Phone number is required'),
    otp: z
      .string({ required_error: 'OTP code is required' })
      .length(6, 'OTP code must be 6 digits')
      .regex(/^[0-9]+$/, 'OTP must be numeric'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    tokenOrOtp: z
      .string({ required_error: 'Reset token or OTP is required' })
      .min(1, 'Reset token or OTP is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'New password must be at least 6 characters'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'New password must be at least 6 characters'),
  }),
});

export const updateMeSchema = z.object({
  body: z
    .object({
      firstName: z.string().min(1, 'First name cannot be empty').optional(),
      lastName: z.string().optional(),
      username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, and underscores')
        .optional(),
      phone: z.string().optional(),
      image: z.string().url('Invalid image URL').optional(),
      bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
      gender: z.string().optional(),
      dateOfBirth: z.coerce.date().optional(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>['body'];
export type SendPhoneOtpInput = z.infer<typeof sendPhoneOtpSchema>['body'];
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type UpdateMeInput = z.infer<typeof updateMeSchema>['body'];
