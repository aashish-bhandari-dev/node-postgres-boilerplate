import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resetPasswordSchema,
} from '../../../src/validations/auth.validation';
import { oauthLoginSchema } from '../../../src/validations/oauth.validation';

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration payload', () => {
      const valid = {
        body: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'Password123!',
          phone: '+1234567890',
        },
      };

      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalid = {
        body: {
          firstName: 'John',
          email: 'not-an-email',
          password: 'Password123!',
        },
      };

      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject password with less than 6 characters', () => {
      const invalid = {
        body: {
          firstName: 'John',
          email: 'john@example.com',
          password: '123',
        },
      };

      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing firstName', () => {
      const invalid = {
        body: {
          email: 'john@example.com',
          password: 'Password123!',
        },
      };

      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login payload', () => {
      const valid = {
        body: {
          identifier: 'user@example.com',
          password: 'secretpassword',
        },
      };

      const result = loginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty identifier or password', () => {
      const invalid = {
        body: {
          identifier: '',
          password: '',
        },
      };

      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyEmailOtpSchema', () => {
    it('should validate a 6-digit numeric OTP', () => {
      const valid = {
        body: {
          email: 'user@example.com',
          otp: '123456',
        },
      };

      const result = verifyEmailOtpSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject OTP that is not 6 digits', () => {
      const short = {
        body: {
          email: 'user@example.com',
          otp: '12345',
        },
      };
      expect(verifyEmailOtpSchema.safeParse(short).success).toBe(false);

      const long = {
        body: {
          email: 'user@example.com',
          otp: '1234567',
        },
      };
      expect(verifyEmailOtpSchema.safeParse(long).success).toBe(false);
    });

    it('should reject non-numeric OTP', () => {
      const invalid = {
        body: {
          email: 'user@example.com',
          otp: '12345a',
        },
      };

      const result = verifyEmailOtpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('oauthLoginSchema', () => {
    it('should validate Google OAuth with idToken', () => {
      const valid = {
        params: { provider: 'google' },
        body: { idToken: 'google_token_123' },
      };

      const result = oauthLoginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate Facebook OAuth with accessToken', () => {
      const valid = {
        params: { provider: 'facebook' },
        body: { accessToken: 'fb_token_123' },
      };

      const result = oauthLoginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate Apple OAuth with idToken and user object', () => {
      const valid = {
        params: { provider: 'apple' },
        body: {
          idToken: 'apple_token_123',
          user: { name: { firstName: 'Jane', lastName: 'Doe' } },
        },
      };

      const result = oauthLoginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject unsupported provider name', () => {
      const invalid = {
        params: { provider: 'unsupported_provider' },
        body: { token: 'token123' },
      };

      const result = oauthLoginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject when no token or code is provided', () => {
      const invalid = {
        params: { provider: 'google' },
        body: {},
      };

      const result = oauthLoginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate valid reset password input', () => {
      const valid = {
        body: {
          email: 'reset@example.com',
          tokenOrOtp: '123456',
          newPassword: 'StrongPassword123!',
        },
      };

      const result = resetPasswordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject weak new password', () => {
      const invalid = {
        body: {
          email: 'reset@example.com',
          tokenOrOtp: '123456',
          newPassword: 'weak',
        },
      };

      const result = resetPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

