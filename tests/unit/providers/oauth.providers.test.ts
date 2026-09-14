import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { GoogleOAuthProvider } from '../../../src/providers/oauth/google.provider';
import { FacebookOAuthProvider } from '../../../src/providers/oauth/facebook.provider';
import { AppleOAuthProvider } from '../../../src/providers/oauth/apple.provider';

describe('OAuth Providers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GoogleOAuthProvider', () => {
    const provider = new GoogleOAuthProvider();

    it('should throw badRequest if neither idToken nor code is provided', async () => {
      await expect(provider.verify({})).rejects.toThrow(
        'Google authentication requires an idToken or authorization code',
      );
    });

    it('should verify idToken and return standardized user profile', async () => {
      const mockGoogleResponse = {
        sub: 'google_123456',
        email: 'googleuser@example.com',
        email_verified: 'true',
        given_name: 'Google',
        family_name: 'User',
        picture: 'https://example.com/avatar.png',
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockGoogleResponse,
        }),
      );

      const profile = await provider.verify({ idToken: 'valid_google_id_token' });

      expect(profile.provider).toBe('GOOGLE');
      expect(profile.providerId).toBe('google_123456');
      expect(profile.email).toBe('googleuser@example.com');
      expect(profile.firstName).toBe('Google');
      expect(profile.lastName).toBe('User');
      expect(profile.image).toBe('https://example.com/avatar.png');
      expect(profile.isEmailVerified).toBe(true);
    });

    it('should throw if Google token endpoint returns non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error_description: 'Invalid Token' }),
        }),
      );

      await expect(provider.verify({ idToken: 'bad_token' })).rejects.toThrow(
        'Invalid or expired Google authentication token',
      );
    });
  });

  describe('FacebookOAuthProvider', () => {
    const provider = new FacebookOAuthProvider();

    it('should throw badRequest if accessToken is missing', async () => {
      await expect(provider.verify({})).rejects.toThrow(
        'Facebook authentication requires an accessToken',
      );
    });

    it('should verify accessToken and return profile', async () => {
      const mockFbResponse = {
        id: 'fb_98765',
        name: 'Mark Zuckerberg',
        first_name: 'Mark',
        last_name: 'Zuckerberg',
        email: 'mark@fb.com',
        picture: {
          data: {
            url: 'https://graph.facebook.com/avatar.png',
          },
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockFbResponse,
        }),
      );

      const profile = await provider.verify({ accessToken: 'fb_token_123' });

      expect(profile.provider).toBe('FACEBOOK');
      expect(profile.providerId).toBe('fb_98765');
      expect(profile.email).toBe('mark@fb.com');
      expect(profile.firstName).toBe('Mark');
      expect(profile.lastName).toBe('Zuckerberg');
      expect(profile.isEmailVerified).toBe(true);
    });

    it('should handle missing email from Facebook with placeholder', async () => {
      const mockFbResponse = {
        id: 'fb_no_email',
        name: 'NoEmail User',
        first_name: 'NoEmail',
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockFbResponse,
        }),
      );

      const profile = await provider.verify({ accessToken: 'fb_token' });
      expect(profile.email).toBe('fb_fb_no_email@facebook.placeholder');
    });
  });

  describe('AppleOAuthProvider', () => {
    const provider = new AppleOAuthProvider();

    it('should throw badRequest if idToken is missing', async () => {
      await expect(provider.verify({})).rejects.toThrow(
        'Apple authentication requires an idToken',
      );
    });

    it('should decode valid Apple identity token and extract profile', async () => {
      const fakeToken = jwt.sign(
        {
          sub: 'apple_sub_111',
          email: 'apple@example.com',
          email_verified: true,
          iss: 'https://appleid.apple.com',
        },
        'mock-secret',
      );

      const profile = await provider.verify({
        idToken: fakeToken,
        user: {
          name: { firstName: 'Apple', lastName: 'Fan' },
        },
      });

      expect(profile.provider).toBe('APPLE');
      expect(profile.providerId).toBe('apple_sub_111');
      expect(profile.email).toBe('apple@example.com');
      expect(profile.firstName).toBe('Apple');
      expect(profile.lastName).toBe('Fan');
      expect(profile.isEmailVerified).toBe(true);
    });
  });
});
