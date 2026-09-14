import { AuthProvider, UserRole } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { hashToken, generateAuthTokens } from '../utils/token.util';
import { UserResource } from '../resources/user.resource';
import { IOAuthProvider, OAuthPayloadInput } from '../types/oauth.types';
import { AuthResponseData } from '../types/auth.types';
import { defaultOAuthProviders } from '../providers/oauth';

export class OAuthService {
  private providers: Map<string, IOAuthProvider> = new Map();

  constructor(customProviders?: Record<string, IOAuthProvider>) {
    const providersToRegister = customProviders || defaultOAuthProviders;
    for (const [key, provider] of Object.entries(providersToRegister)) {
      this.providers.set(key.toLowerCase(), provider);
    }
  }

  /**
   * Register or override an OAuth provider dynamically
   */
  registerProvider(provider: IOAuthProvider): void {
    this.providers.set(provider.provider.toLowerCase(), provider);
  }

  /**
   * Authenticate a user via an OAuth provider.
   * Handles user creation, account linking, email verification, and session token generation.
   */
  async authenticate(
    providerName: string,
    payload: OAuthPayloadInput,
    ip?: string,
  ): Promise<AuthResponseData> {
    const normalizedName = providerName.toLowerCase();
    const provider = this.providers.get(normalizedName);

    if (!provider) {
      const supported = Array.from(
        new Set(Array.from(this.providers.values()).map((p) => p.provider)),
      ).join(', ');
      throw ApiError.badRequest(
        `Unsupported OAuth provider '${providerName}'. Supported providers are: ${supported}`,
      );
    }

    // Verify token / code with the provider
    const profile = await provider.verify(payload);

    logger.info(
      `[OAuth] Authenticating ${profile.provider} user: ${profile.email} (Provider ID: ${profile.providerId})`,
    );

    // 1. Find existing user by provider + providerId OR by email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            provider: profile.provider,
            providerId: profile.providerId,
          },
          {
            email: profile.email,
          },
        ],
        deletedAt: null,
      },
    });

    if (user) {
      // Check status
      if (!user.isActive || user.isDeactivated) {
        throw ApiError.forbidden('Your account has been deactivated or disabled.');
      }

      // Link provider if not linked yet or update avatar/email verification
      const needsLinking = !user.providerId || user.provider === AuthProvider.LOCAL;
      const needsEmailVerification = !user.isEmailVerified && profile.isEmailVerified;
      const needsAvatar = !user.image && profile.image;

      if (needsLinking || needsEmailVerification || needsAvatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(needsLinking && {
              provider: profile.provider,
              providerId: profile.providerId,
            }),
            ...(needsEmailVerification && {
              isEmailVerified: true,
              emailVerifiedAt: new Date(),
            }),
            ...(needsAvatar && {
              image: profile.image,
            }),
          },
        });
      }
    } else {
      // 2. Create new user for first-time social sign-in
      // Generate unique username suggestion
      const baseUsername = profile.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      const existingWithUsername = await prisma.user.findUnique({ where: { username } });
      if (existingWithUsername) {
        username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      user = await prisma.user.create({
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          username,
          email: profile.email,
          image: profile.image,
          password: null, // OAuth-only account
          role: UserRole.USER,
          provider: profile.provider,
          providerId: profile.providerId,
          isEmailVerified: profile.isEmailVerified,
          emailVerifiedAt: profile.isEmailVerified ? new Date() : null,
          isActive: true,
          isDeactivated: false,
        },
      });

      logger.info(`[OAuth] Created new user from ${profile.provider}: ${user.email} (ID: ${user.id})`);
    }

    // Generate JWT access & refresh token pair
    const tokens = generateAuthTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Update session tracking and refresh token hash
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
}

export const oauthService = new OAuthService();
