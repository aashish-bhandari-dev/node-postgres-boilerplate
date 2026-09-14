import { AuthProvider } from '@prisma/client';
import { IOAuthProvider, OAuthPayloadInput, OAuthUserProfile } from '../../types/oauth.types';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  aud?: string;
  error_description?: string;
}

export class GoogleOAuthProvider implements IOAuthProvider {
  readonly provider: AuthProvider = AuthProvider.GOOGLE;

  async verify(payload: OAuthPayloadInput): Promise<OAuthUserProfile> {
    const idToken = payload.idToken || payload.token;

    // Direct ID Token verification (primary for SPAs and Mobile Apps)
    if (idToken) {
      return this.verifyIdToken(idToken);
    }

    // Server-side Authorization Code Exchange
    if (payload.code) {
      return this.exchangeCode(payload.code, payload.redirectUri);
    }

    throw ApiError.badRequest('Google authentication requires an idToken or authorization code.');
  }

  private async verifyIdToken(idToken: string): Promise<OAuthUserProfile> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );

      if (!response.ok) {
        throw new Error('Google tokeninfo endpoint returned an error.');
      }

      const data = (await response.json()) as GoogleTokenInfo;

      if (!data.sub || !data.email) {
        throw new Error('Missing sub or email in Google token response.');
      }

      // If client ID is configured in env, ensure audience matches
      if (env.GOOGLE_CLIENT_ID && data.aud && data.aud !== env.GOOGLE_CLIENT_ID) {
        throw new Error(`Google token audience mismatch. Expected: ${env.GOOGLE_CLIENT_ID}, received: ${data.aud}`);
      }

      const isEmailVerified = data.email_verified === 'true' || data.email_verified === true;
      const firstName = data.given_name || data.name?.split(' ')[0] || data.email.split('@')[0];
      const lastName = data.family_name || (data.name?.split(' ').slice(1).join(' ') || null);

      return {
        provider: this.provider,
        providerId: data.sub,
        email: data.email.toLowerCase(),
        firstName,
        lastName,
        image: data.picture || null,
        isEmailVerified,
        rawProfile: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      logger.error('[GoogleOAuth] Verification failed:', error);
      throw ApiError.unauthorized('Invalid or expired Google authentication token.');
    }
  }

  private async exchangeCode(code: string, redirectUri?: string): Promise<OAuthUserProfile> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw ApiError.internal('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set for code exchange.');
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri || `http://${env.HOST}:${env.PORT}/api/v1/auth/oauth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Google token exchange failed');
      }

      const tokens = (await tokenResponse.json()) as { id_token?: string; access_token?: string };
      if (!tokens.id_token) {
        throw new Error('No id_token returned from Google code exchange');
      }

      return this.verifyIdToken(tokens.id_token);
    } catch (error) {
      logger.error('[GoogleOAuth] Code exchange failed:', error);
      throw ApiError.unauthorized('Failed to exchange Google authorization code.');
    }
  }
}
