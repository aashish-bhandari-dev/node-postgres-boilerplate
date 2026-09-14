import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthProvider } from '@prisma/client';
import {
  IOAuthProvider,
  OAuthPayloadInput,
  OAuthUserProfile,
} from '../../types/oauth.types';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

interface AppleJwtPayload extends JwtPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  iss?: string;
  aud?: string;
}

export class AppleOAuthProvider implements IOAuthProvider {
  readonly provider: AuthProvider = AuthProvider.APPLE;

  async verify(payload: OAuthPayloadInput): Promise<OAuthUserProfile> {
    const idToken = payload.idToken || payload.token;

    if (!idToken) {
      throw ApiError.badRequest('Apple authentication requires an idToken.');
    }

    try {
      // Decode the Apple identity JWT
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        throw new Error('Malformed Apple identity token.');
      }

      const claims = decoded.payload as AppleJwtPayload;

      if (!claims.sub) {
        throw new Error('Missing sub claim in Apple identity token.');
      }

      // Check issuer
      if (claims.iss && claims.iss !== 'https://appleid.apple.com') {
        throw new Error('Invalid issuer in Apple token.');
      }

      // If client ID configured in env, ensure audience matches
      if (env.APPLE_CLIENT_ID && claims.aud && claims.aud !== env.APPLE_CLIENT_ID) {
        throw new Error(
          `Apple audience mismatch. Expected: ${env.APPLE_CLIENT_ID}, received: ${claims.aud}`,
        );
      }

      // In case user hid their email or Apple didn't include it in subsequent logins
      const email = claims.email
        ? claims.email.toLowerCase()
        : `apple_${claims.sub}@apple.placeholder`;

      // Apple only returns the user's name in the POST request body on the very first sign-in
      const firstName =
        payload.user?.name?.firstName ||
        (claims.email ? claims.email.split('@')[0] : 'Apple User');
      const lastName = payload.user?.name?.lastName || null;

      const isEmailVerified =
        claims.email_verified === true || claims.email_verified === 'true';

      return {
        provider: this.provider,
        providerId: claims.sub,
        email,
        firstName,
        lastName,
        image: null, // Apple does not provide profile images
        isEmailVerified: isEmailVerified || true, // Apple verified
        rawProfile: claims as unknown as Record<string, unknown>,
      };
    } catch (error) {
      logger.error('[AppleOAuth] Verification failed:', error);
      throw ApiError.unauthorized('Invalid or expired Apple identity token.');
    }
  }
}
