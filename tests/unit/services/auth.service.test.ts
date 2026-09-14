import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole, AuthProvider } from '@prisma/client';
import { AuthService } from '../../../src/services/auth.service';
import { prisma } from '../../../src/config/db';
import { mailService } from '../../../src/services/mail.service';
import { hashPassword } from '../../../src/utils/password.util';
import { hashToken } from '../../../src/utils/token.util';

// Mock dependencies
vi.mock('../../../src/config/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/mail.service', () => ({
  mailService: {
    sendEmailVerificationOtp: vi.fn().mockResolvedValue({ success: true }),
    sendEmailVerificationLink: vi.fn().mockResolvedValue({ success: true }),
    sendPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('Auth Service', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new user, hash password, create verification OTP and dispatch email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const mockCreatedUser = {
        id: 'usr_new_1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        phone: null,
        password: 'hashed_password',
        role: UserRole.CUSTOMER,
        provider: AuthProvider.LOCAL,
        isEmailVerified: false,
        isPhoneVerified: false,
        isActive: true,
        isDeactivated: false,
        metadata: { emailOtpExpiresAt: new Date(Date.now() + 600000).toISOString() },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any);

      const result = await authService.register({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePassword123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('john@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(mailService.sendEmailVerificationOtp).toHaveBeenCalled();
    });

    it('should throw conflict error if email is already taken', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing_usr' } as any);

      await expect(
        authService.register({
          firstName: 'John',
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow('An account with this email address already exists');
    });

    it('should throw conflict error if username is already taken', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // email check passes
        .mockResolvedValueOnce({ id: 'existing_username_usr' } as any); // username check fails

      await expect(
        authService.register({
          firstName: 'John',
          username: 'taken_user',
          email: 'available@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow('Username is already taken');
    });

    it('should throw conflict error if phone is already taken', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // email check passes
        .mockResolvedValueOnce(null) // username check passes
        .mockResolvedValueOnce({ id: 'existing_phone_usr' } as any); // phone check fails

      await expect(
        authService.register({
          firstName: 'John',
          username: 'valid_user',
          email: 'phone_test@example.com',
          phone: '+1234567890',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow('Phone number is already associated with another account');
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials and return tokens', async () => {
      const password = 'CorrectPassword123!';
      const hashedPassword = await hashPassword(password);

      const mockUser = {
        id: 'usr_login_1',
        firstName: 'Jane',
        lastName: 'Doe',
        username: 'janedoe',
        email: 'jane@example.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        provider: AuthProvider.LOCAL,
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        isDeactivated: false,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const result = await authService.login({
        identifier: 'jane@example.com',
        password,
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockoutUntil: null,
          }),
        }),
      );
    });

    it('should throw 401 on non-existent user', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        authService.login({
          identifier: 'nobody@example.com',
          password: 'SomePassword123!',
        }),
      ).rejects.toThrow('Invalid email/identifier or password');
    });

    it('should throw 423 if account is locked out', async () => {
      const futureLockout = new Date(Date.now() + 15 * 60 * 1000);
      const lockedUser = {
        id: 'usr_locked',
        email: 'locked@example.com',
        lockoutUntil: futureLockout,
        failedLoginAttempts: 5,
        isActive: true,
        isDeactivated: false,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(lockedUser as any);

      await expect(
        authService.login({
          identifier: 'locked@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('Account is temporarily locked');
    });

    it('should increment failed login attempts on incorrect password', async () => {
      const hashedPassword = await hashPassword('CorrectPassword123!');
      const mockUser = {
        id: 'usr_failed',
        email: 'failed@example.com',
        password: hashedPassword,
        failedLoginAttempts: 2,
        lockoutUntil: null,
        isActive: true,
        isDeactivated: false,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      await expect(
        authService.login({
          identifier: 'failed@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow('Invalid email/identifier or password');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 3,
          }),
        }),
      );
    });

    it('should require email verification if user email is unverified, dispatch fresh OTP and throw 403', async () => {
      const { env } = await import('../../../src/config/env');
      const originalRequireEmail = env.AUTH_REQUIRE_EMAIL_VERIFICATION;
      (env as any).AUTH_REQUIRE_EMAIL_VERIFICATION = true;

      try {
        const password = 'Password123!';
        const hashedPassword = await hashPassword(password);

        const unverifiedUser = {
          id: 'usr_unverified',
          firstName: 'Unverified',
          email: 'unverified@example.com',
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockoutUntil: null,
          isEmailVerified: false,
          isActive: true,
          isDeactivated: false,
          metadata: {},
        };

        vi.mocked(prisma.user.findFirst).mockResolvedValue(unverifiedUser as any);
        vi.mocked(prisma.user.update).mockResolvedValue(unverifiedUser as any);

        await expect(
          authService.login({
            identifier: 'unverified@example.com',
            password,
          }),
        ).rejects.toThrow('Email is not verified');

        expect(mailService.sendEmailVerificationOtp).toHaveBeenCalledWith(
          'unverified@example.com',
          'Unverified',
          expect.any(String),
        );
      } finally {
        (env as any).AUTH_REQUIRE_EMAIL_VERIFICATION = originalRequireEmail;
      }
    });
  });

  describe('verifyEmailOtp', () => {
    it('should verify email when OTP is valid and unexpired', async () => {
      const validOtp = '123456';
      const hashedOtp = hashToken(validOtp);
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const userWithOtp = {
        id: 'usr_verify_1',
        email: 'verify@example.com',
        isEmailVerified: false,
        emailVerificationToken: hashedOtp,
        metadata: { emailOtpExpiresAt: futureExpiry },
        isActive: true,
        isDeactivated: false,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const verifiedUser = {
        ...userWithOtp,
        isEmailVerified: true,
        emailVerificationToken: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithOtp as any);
      vi.mocked(prisma.user.update).mockResolvedValue(verifiedUser as any);

      const result = await authService.verifyEmailOtp('verify@example.com', validOtp);

      expect((result.user as any).isEmailVerified).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userWithOtp.id },
          data: expect.objectContaining({
            isEmailVerified: true,
            emailVerificationToken: null,
          }),
        }),
      );
    });

    it('should throw 400 if OTP is expired', async () => {
      const pastExpiry = new Date(Date.now() - 60000).toISOString();
      const userWithExpiredOtp = {
        id: 'usr_expired',
        email: 'expired@example.com',
        isEmailVerified: false,
        emailVerificationToken: hashToken('123456'),
        metadata: { emailOtpExpiresAt: pastExpiry },
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithExpiredOtp as any);

      await expect(
        authService.verifyEmailOtp('expired@example.com', '123456'),
      ).rejects.toThrow('Verification code has expired');
    });

    it('should throw 400 if OTP is invalid', async () => {
      const user = {
        id: 'usr_invalid_otp',
        email: 'test@example.com',
        isEmailVerified: false,
        emailVerificationToken: hashToken('654321'),
        metadata: { emailOtpExpiresAt: new Date(Date.now() + 60000).toISOString() },
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      await expect(
        authService.verifyEmailOtp('test@example.com', '111111'),
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('refreshToken', () => {
    it('should reject invalid or expired refresh token', async () => {
      await expect(
        authService.refreshToken('invalid_token_string'),
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('should clear stored refresh token hash', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 'usr_1' } as any);

      await authService.logout('usr_1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset code and dispatch email if user exists', async () => {
      const user = {
        id: 'usr_forgot',
        email: 'forgot@example.com',
        firstName: 'Forgot',
        metadata: {},
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
      vi.mocked(prisma.user.update).mockResolvedValue(user as any);

      const result = await authService.forgotPassword('forgot@example.com');

      expect(result.message).toContain('password reset instructions have been sent');
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(mailService.sendPasswordReset).toHaveBeenCalled();
    });

    it('should return generic success message even if user does not exist (anti-enumeration)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await authService.forgotPassword('notfound@example.com');

      expect(result.message).toContain('password reset instructions have been sent');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid OTP and clear reset token', async () => {
      const resetOtp = '987654';
      const hashedResetOtp = hashToken(resetOtp);
      const futureExpiry = new Date(Date.now() + 15 * 60 * 1000);

      const user = {
        id: 'usr_reset',
        email: 'reset@example.com',
        resetOtpHash: hashedResetOtp,
        resetOtpExpiresAt: futureExpiry,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
      vi.mocked(prisma.user.update).mockResolvedValue(user as any);

      await authService.resetPassword({
        email: 'reset@example.com',
        tokenOrOtp: resetOtp,
        newPassword: 'NewStrongPassword123!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: expect.objectContaining({
            resetOtpHash: null,
            resetOtpExpiresAt: null,
            refreshTokenHash: null,
          }),
        }),
      );
    });

    it('should throw 400 if password reset code is invalid', async () => {
      const user = {
        id: 'usr_reset',
        email: 'reset@example.com',
        resetOtpHash: hashToken('987654'),
        resetOtpExpiresAt: new Date(Date.now() + 60000),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

      await expect(
        authService.resetPassword({
          email: 'reset@example.com',
          tokenOrOtp: '000000',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow('Invalid password reset token');
    });
  });
});


