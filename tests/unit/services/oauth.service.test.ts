import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, UserRole } from '@prisma/client';
import { OAuthService } from '../../../src/services/oauth.service';
import { IOAuthProvider, OAuthPayloadInput, OAuthUserProfile } from '../../../src/types/oauth.types';
import { prisma } from '../../../src/config/db';

vi.mock('../../../src/config/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('OAuth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject unsupported provider with 400 Bad Request', async () => {
    const oauthService = new OAuthService();

    await expect(
      oauthService.authenticate('unknown_provider', { token: '123' }),
    ).rejects.toThrow('Unsupported OAuth provider');
  });

  it('should create new user with verified email and null password for social sign-in', async () => {
    const testEmail = 'oauth.new@example.com';
    const mockProvider: IOAuthProvider = {
      provider: AuthProvider.GOOGLE,
      async verify(_payload: OAuthPayloadInput): Promise<OAuthUserProfile> {
        return {
          provider: AuthProvider.GOOGLE,
          providerId: 'google_sub_123',
          email: testEmail,
          firstName: 'Google',
          lastName: 'Tester',
          image: 'https://lh3.googleusercontent.com/avatar.jpg',
          isEmailVerified: true,
        };
      },
    };

    const mockCreatedUser = {
      id: 'usr_new_123',
      firstName: 'Google',
      lastName: 'Tester',
      username: 'oauthnew',
      email: testEmail,
      image: 'https://lh3.googleusercontent.com/avatar.jpg',
      password: null,
      role: UserRole.USER,
      provider: AuthProvider.GOOGLE,
      providerId: 'google_sub_123',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockCreatedUser as any);

    const oauthService = new OAuthService({ google: mockProvider });
    const result = await oauthService.authenticate('google', { idToken: 'mock_token' });

    expect(result.user).toBeDefined();
    expect(result.tokens).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.provider).toBe(AuthProvider.GOOGLE);
    expect(result.user.isEmailVerified).toBe(true);

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('should link social providerId to existing local user with matching email', async () => {
    const sharedEmail = 'existing.local@example.com';

    const existingUser = {
      id: 'usr_existing_456',
      firstName: 'Existing',
      lastName: 'LocalUser',
      username: 'existinglocal',
      email: sharedEmail,
      image: null,
      password: '$2b$10$hashedpasswordplaceholder',
      role: UserRole.USER,
      provider: AuthProvider.LOCAL,
      providerId: null,
      isEmailVerified: false,
      emailVerifiedAt: null,
      isActive: true,
      isDeactivated: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedUser = {
      ...existingUser,
      provider: AuthProvider.FACEBOOK,
      providerId: 'fb_id_999',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(existingUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

    const mockFbProvider: IOAuthProvider = {
      provider: AuthProvider.FACEBOOK,
      async verify(): Promise<OAuthUserProfile> {
        return {
          provider: AuthProvider.FACEBOOK,
          providerId: 'fb_id_999',
          email: sharedEmail,
          firstName: 'Existing',
          lastName: 'LocalUser',
          isEmailVerified: true,
        };
      },
    };

    const oauthService = new OAuthService({ facebook: mockFbProvider });
    const result = await oauthService.authenticate('facebook', { accessToken: 'mock_fb_token' });

    expect(result.user.id).toBe(existingUser.id);
    expect(result.user.isEmailVerified).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('should reject sign-in if user account is deactivated', async () => {
    const deactivatedUser = {
      id: 'usr_deactivated',
      email: 'deactivated@example.com',
      isActive: true,
      isDeactivated: true,
      provider: AuthProvider.GOOGLE,
      providerId: 'google_deactivated',
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(deactivatedUser as any);

    const mockProvider: IOAuthProvider = {
      provider: AuthProvider.GOOGLE,
      async verify(): Promise<OAuthUserProfile> {
        return {
          provider: AuthProvider.GOOGLE,
          providerId: 'google_deactivated',
          email: 'deactivated@example.com',
          firstName: 'Deact',
          lastName: 'User',
          isEmailVerified: true,
        };
      },
    };

    const oauthService = new OAuthService({ google: mockProvider });
    await expect(
      oauthService.authenticate('google', { idToken: 'token' }),
    ).rejects.toThrow('Your account has been deactivated or disabled');
  });
});

