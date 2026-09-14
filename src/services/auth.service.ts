import { UserRole, AuthProvider, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { HttpStatus } from '../constants/httpStatus';
import { logger } from '../utils/logger';
import { hashPassword, comparePassword } from '../utils/password.util';
import {
  generateAuthTokens,
  generateRandomToken,
  generateNumericOtp,
  hashToken,
  verifyRefreshToken,
} from '../utils/token.util';
import { UserResource } from '../resources/user.resource';
import { mailService } from './mail.service';
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateMeInput,
} from '../validations/auth.validation';
import { AuthResponseData, AuthTokens } from '../types/auth.types';

export class AuthService {
  /**
   * Register a new user with email, password, and optional phone/profile details.
   */
  async register(input: RegisterInput): Promise<AuthResponseData> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // Check duplicate username if provided
    if (input.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: input.username },
      });
      if (existingUsername) {
        throw ApiError.conflict('Username is already taken');
      }
    }

    // Check duplicate phone if provided
    if (input.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingPhone) {
        throw ApiError.conflict('Phone number is already associated with another account');
      }
    }

    const hashedPassword = await hashPassword(input.password);

    // Support both 6-digit numeric OTP and 32-byte link token
    const isOtpMode = env.EMAIL_VERIFICATION_TYPE === 'otp';
    const rawVerificationCode = isOtpMode ? generateNumericOtp(6) : generateRandomToken(32);
    const storedVerificationToken = isOtpMode ? hashToken(rawVerificationCode) : rawVerificationCode;
    const emailOtpExpiresAt = isOtpMode
      ? new Date(Date.now() + env.EMAIL_OTP_EXPIRES_MINUTES * 60 * 1000).toISOString()
      : null;

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName ? input.lastName.trim() : null,
        username: input.username ? input.username.trim() : null,
        email: normalizedEmail,
        password: hashedPassword,
        phone: input.phone ? input.phone.trim() : null,
        locale: input.locale || 'en',
        timezone: input.timezone || 'UTC',
        role: UserRole.CUSTOMER,
        provider: AuthProvider.LOCAL,
        isEmailVerified: false,
        emailVerificationToken: storedVerificationToken,
        isPhoneVerified: false,
        isActive: true,
        isDeactivated: false,
        metadata: emailOtpExpiresAt ? { emailOtpExpiresAt } : {},
      },
    });

    logger.info(`[Auth] Registered new user: ${user.email} (ID: ${user.id})`);

    // Dispatch verification email asynchronously
    if (isOtpMode) {
      logger.info(`[Auth] Verification OTP for ${user.email}: ${rawVerificationCode}`);
      mailService
        .sendEmailVerificationOtp(user.email, user.firstName, rawVerificationCode)
        .catch((err) => logger.error('[Auth] Error sending verification email OTP:', err));
    } else {
      const verifyUrl = `http://${env.HOST}:${env.PORT}/api/v1/auth/verify-email?token=${rawVerificationCode}`;
      logger.info(`[Auth] Verification Link for ${user.email}: ${verifyUrl}`);
      mailService
        .sendEmailVerificationLink(user.email, user.firstName, verifyUrl)
        .catch((err) => logger.error('[Auth] Error sending verification link email:', err));
    }

    // If global toggle requires email verification, do not issue tokens until verified
    if (env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
      return {
        user: new UserResource(user).toJSON(),
        requiresVerification: {
          email: true,
          phone: env.AUTH_REQUIRE_PHONE_VERIFICATION,
        },
        ...(env.NODE_ENV === 'development' && isOtpMode && { otp: rawVerificationCode }),
      };
    }

    // Otherwise issue active tokens immediately
    const tokens = generateAuthTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token hash
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: hashToken(tokens.refreshToken),
      },
    });

    return {
      user: new UserResource(user).toJSON(),
      tokens,
      requiresVerification: {
        email: false,
        phone: false,
      },
    };
  }

  /**
   * Log in user with identifier (email, username, or phone) and password.
   * Handles lockout checks and flexible verification toggles.
   */
  async login(input: LoginInput, ip?: string): Promise<AuthResponseData> {
    const identifier = input.identifier.trim();

    // Look up by email, username, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
          { phone: identifier },
        ],
        deletedAt: null,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email/identifier or password');
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new ApiError(
        HttpStatus.LOCKED,
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
      );
    }

    // Check if user has a password set (social login accounts may have null password)
    if (!user.password) {
      throw ApiError.badRequest(
        `This account is registered with ${user.provider}. Please log in using that provider.`,
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(input.password, user.password);

    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      let lockoutUntil: Date | null = null;

      if (failedAttempts >= env.AUTH_MAX_LOGIN_ATTEMPTS) {
        lockoutUntil = new Date(
          Date.now() + env.AUTH_LOCKOUT_DURATION_MINUTES * 60 * 1000,
        );
        logger.warn(
          `[Auth] Account locked for user: ${user.email} after ${failedAttempts} failed attempts`,
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockoutUntil,
        },
      });

      if (lockoutUntil) {
        throw new ApiError(
          HttpStatus.LOCKED,
          `Too many failed login attempts. Your account has been temporarily locked for ${env.AUTH_LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      throw ApiError.unauthorized('Invalid email/identifier or password');
    }

    // Check account status
    if (!user.isActive || user.isDeactivated) {
      throw ApiError.forbidden('Your account is currently deactivated or disabled. Please contact support.');
    }

    // Check flexible email verification toggle
    if (env.AUTH_REQUIRE_EMAIL_VERIFICATION && !user.isEmailVerified) {
      // Automatically generate fresh 6-digit verification OTP
      const otp = generateNumericOtp(6);
      const expiresAt = new Date(
        Date.now() + env.EMAIL_OTP_EXPIRES_MINUTES * 60 * 1000,
      ).toISOString();
      const existingMetadata = (user.metadata as Record<string, unknown>) || {};

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: hashToken(otp),
          metadata: {
            ...existingMetadata,
            emailOtpExpiresAt: expiresAt,
          } as Prisma.InputJsonValue,
        },
      });

      logger.info(`[Auth] User ${user.email} attempted login with unverified email. Dispatched fresh OTP: ${otp}`);

      // Send OTP to email
      mailService
        .sendEmailVerificationOtp(user.email, user.firstName, otp)
        .catch((err) => logger.error('[Auth] Failed to send email verification OTP on login:', err));

      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'Email is not verified. A verification code has been sent to your email address.',
        [
          {
            code: 'EMAIL_NOT_VERIFIED',
            email: user.email,
            message: 'Please verify your email using the OTP code sent to your inbox.',
            ...(env.NODE_ENV === 'development' && { otp }),
          },
        ],
      );
    }

    // Check flexible phone verification toggle
    if (env.AUTH_REQUIRE_PHONE_VERIFICATION && !user.isPhoneVerified) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'Phone verification is required before you can log in.',
        [{ code: 'PHONE_NOT_VERIFIED', phone: user.phone }],
      );
    }

    // Generate tokens
    const tokens = generateAuthTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Reset failed attempts, update last login, and store refresh token hash
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? null,
        refreshTokenHash: hashToken(tokens.refreshToken),
      },
    });

    return {
      user: new UserResource(updatedUser).toJSON(),
      tokens,
    };
  }

  /**
   * Rotate access and refresh tokens.
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const hashedIncomingToken = hashToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (
      !user ||
      user.deletedAt ||
      !user.isActive ||
      user.isDeactivated ||
      user.refreshTokenHash !== hashedIncomingToken
    ) {
      throw ApiError.unauthorized('Invalid or revoked refresh token. Please log in again.');
    }

    // Rotate tokens
    const newTokens = generateAuthTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: hashToken(newTokens.refreshToken),
      },
    });

    return newTokens;
  }

  /**
   * Log out user by clearing the stored refresh token hash.
   */
  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });
  }

  /**
   * Verify user email via verification token.
   */
  async verifyEmail(token: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        deletedAt: null,
      },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired email verification token');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
      },
    });

    return new UserResource(updatedUser).toJSON();
  }

  /**
   * Resend email verification (OTP or link depending on configuration).
   */
  async resendVerificationEmail(email: string): Promise<{ message: string; token?: string; otp?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt) {
      return { message: 'If that email address is registered, verification instructions have been sent.' };
    }

    if (user.isEmailVerified) {
      throw ApiError.badRequest('This email address is already verified.');
    }

    const isOtpMode = env.EMAIL_VERIFICATION_TYPE === 'otp';
    const rawCodeOrToken = isOtpMode ? generateNumericOtp(6) : generateRandomToken(32);
    const storedToken = isOtpMode ? hashToken(rawCodeOrToken) : rawCodeOrToken;
    const emailOtpExpiresAt = isOtpMode
      ? new Date(Date.now() + env.EMAIL_OTP_EXPIRES_MINUTES * 60 * 1000).toISOString()
      : null;

    const existingMetadata = (user.metadata as Record<string, unknown>) || {};
    const newMetadata = emailOtpExpiresAt
      ? { ...existingMetadata, emailOtpExpiresAt }
      : existingMetadata;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: storedToken,
        metadata: newMetadata as Prisma.InputJsonValue,
      },
    });

    if (isOtpMode) {
      logger.info(`[Auth] Resent verification OTP for ${user.email}: ${rawCodeOrToken}`);
      mailService
        .sendEmailVerificationOtp(user.email, user.firstName, rawCodeOrToken)
        .catch((err) => logger.error('[Auth] Error sending verification OTP email:', err));

      return {
        message: 'A verification code has been sent to your email address.',
        ...(env.NODE_ENV === 'development' && { otp: rawCodeOrToken }),
      };
    } else {
      const verifyUrl = `http://${env.HOST}:${env.PORT}/api/v1/auth/verify-email?token=${rawCodeOrToken}`;
      logger.info(`[Auth] Resent verification link for ${user.email}: ${verifyUrl}`);
      mailService
        .sendEmailVerificationLink(user.email, user.firstName, verifyUrl)
        .catch((err) => logger.error('[Auth] Error sending verification link email:', err));

      return {
        message: 'A verification link has been sent to your email address.',
        ...(env.NODE_ENV === 'development' && { token: rawCodeOrToken }),
      };
    }
  }

  /**
   * Send a fresh 6-digit OTP specifically for email verification.
   */
  async sendEmailOtp(email: string): Promise<{ message: string; otp?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt) {
      return { message: 'If that email address is registered, a verification code has been sent.' };
    }

    if (user.isEmailVerified) {
      throw ApiError.badRequest('This email address is already verified.');
    }

    const otp = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + env.EMAIL_OTP_EXPIRES_MINUTES * 60 * 1000).toISOString();
    const existingMetadata = (user.metadata as Record<string, unknown>) || {};

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashToken(otp),
        metadata: {
          ...existingMetadata,
          emailOtpExpiresAt: expiresAt,
        } as Prisma.InputJsonValue,
      },
    });

    logger.info(`[Auth] Sent email verification OTP to ${user.email}: ${otp}`);

    mailService
      .sendEmailVerificationOtp(user.email, user.firstName, otp)
      .catch((err) => logger.error('[Auth] Failed to send email OTP:', err));

    return {
      message: 'Verification code sent to your email address.',
      ...(env.NODE_ENV === 'development' && { otp }),
    };
  }

  /**
   * Verify email address using 6-digit numeric OTP code.
   */
  async verifyEmailOtp(email: string, otp: string): Promise<Record<string, unknown>> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt || !user.emailVerificationToken) {
      throw ApiError.badRequest('No pending verification found or code is invalid.');
    }

    if (user.isEmailVerified) {
      throw ApiError.badRequest('This email address is already verified.');
    }

    // Check expiration if stored in metadata
    const userMetadata = (user.metadata as Record<string, unknown>) || {};
    if (userMetadata.emailOtpExpiresAt) {
      const expiresAt = new Date(userMetadata.emailOtpExpiresAt as string);
      if (expiresAt < new Date()) {
        throw ApiError.badRequest('Verification code has expired. Please request a new one.');
      }
    }

    // Check hashed OTP
    const hashedOtp = hashToken(otp);
    if (user.emailVerificationToken !== hashedOtp) {
      throw ApiError.badRequest('Invalid verification code.');
    }

    const { emailOtpExpiresAt: _, ...cleanedMetadata } = userMetadata;

    // Issue auth tokens so user is immediately logged in upon OTP verification!
    const tokens = generateAuthTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        metadata: cleanedMetadata as Prisma.InputJsonValue,
        refreshTokenHash: hashToken(tokens.refreshToken),
      },
    });

    logger.info(`[Auth] Email verified via OTP for: ${user.email}`);

    return {
      user: new UserResource(updatedUser).toJSON(),
      tokens,
    };
  }

  /**
   * Send 6-digit OTP for phone verification.
   */
  async sendPhoneOtp(phone: string): Promise<{ message: string; otp?: string }> {
    const normalizedPhone = phone.trim();
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
    });

    if (!user) {
      throw ApiError.notFound('No account associated with this phone number.');
    }

    if (user.isPhoneVerified) {
      throw ApiError.badRequest('This phone number is already verified.');
    }

    const otp = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + env.AUTH_OTP_EXPIRES_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpHash: hashToken(otp),
        resetOtpExpiresAt: expiresAt,
      },
    });

    logger.info(`[Auth] Generated phone OTP for ${phone}: ${otp} (expires in ${env.AUTH_OTP_EXPIRES_MINUTES}m)`);

    return {
      message: 'Verification code sent to phone number successfully.',
      ...(env.NODE_ENV === 'development' && { otp }),
    };
  }

  /**
   * Verify phone number using 6-digit OTP.
   */
  async verifyPhone(phone: string, otp: string): Promise<Record<string, unknown>> {
    const normalizedPhone = phone.trim();
    const user = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        deletedAt: null,
      },
    });

    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      throw ApiError.badRequest('No pending verification code found for this phone number.');
    }

    if (user.resetOtpExpiresAt < new Date()) {
      throw ApiError.badRequest('Verification code has expired. Please request a new one.');
    }

    const hashedOtp = hashToken(otp);
    if (user.resetOtpHash !== hashedOtp) {
      throw ApiError.badRequest('Invalid verification code.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
        resetOtpHash: null,
        resetOtpExpiresAt: null,
      },
    });

    return new UserResource(updatedUser).toJSON();
  }

  /**
   * Request password reset token or OTP via email.
   */
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt) {
      return { message: 'If an account exists with that email, password reset instructions have been sent.' };
    }

    // Generate 6-digit numeric OTP or token for reset
    const resetCode = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + env.AUTH_OTP_EXPIRES_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpHash: hashToken(resetCode),
        resetOtpExpiresAt: expiresAt,
      },
    });

    logger.info(`[Auth] Password reset OTP for ${email}: ${resetCode}`);

    // Send email with reset code
    mailService
      .sendPasswordReset(user.email, user.firstName, resetCode, env.AUTH_OTP_EXPIRES_MINUTES)
      .catch((err) => logger.error('[Auth] Failed to send password reset email:', err));

    return {
      message: 'If an account exists with that email, password reset instructions have been sent.',
      ...(env.NODE_ENV === 'development' && { resetToken: resetCode }),
    };
  }

  /**
   * Reset password using the reset token or OTP.
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      throw ApiError.badRequest('Invalid or expired password reset request.');
    }

    if (user.resetOtpExpiresAt < new Date()) {
      throw ApiError.badRequest('Password reset token has expired. Please request a new one.');
    }

    const hashedInput = hashToken(input.tokenOrOtp);
    if (user.resetOtpHash !== hashedInput) {
      throw ApiError.badRequest('Invalid password reset token.');
    }

    const hashedPassword = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        resetOtpHash: null,
        resetOtpExpiresAt: null,
        refreshTokenHash: null, // Revoke all existing sessions
      },
    });

    logger.info(`[Auth] Password reset successfully for ${user.email}`);
  }

  /**
   * Change password for authenticated user.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt || !user.password) {
      throw ApiError.unauthorized('User not found or invalid account state.');
    }

    const isMatch = await comparePassword(input.currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    const hashedNewPassword = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        passwordChangedAt: new Date(),
        refreshTokenHash: null, // Invalidate previous refresh tokens
      },
    });

    logger.info(`[Auth] Password changed by user: ${user.email}`);
  }

  /**
   * Get current authenticated user profile.
   */
  async getMe(userId: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw ApiError.notFound('User not found.');
    }

    return new UserResource(user).toJSON();
  }

  /**
   * Update current authenticated user profile.
   */
  async updateMe(userId: string, data: UpdateMeInput): Promise<Record<string, unknown>> {
    // If updating username, check uniqueness
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw ApiError.conflict('Username is already taken.');
      }
    }

    // If updating phone, check uniqueness and reset phone verification
    const phoneUpdate = data.phone !== undefined ? {
      phone: data.phone,
      isPhoneVerified: false,
      phoneVerifiedAt: null,
    } : {};

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.metadata !== undefined && { metadata: data.metadata as object }),
        ...phoneUpdate,
      },
    });

    return new UserResource(updatedUser).toJSON();
  }
}

export const authService = new AuthService();
