import { AuthProvider } from '@prisma/client';
import { IOAuthProvider, OAuthPayloadInput, OAuthUserProfile } from '../../types/oauth.types';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

interface FacebookProfileResponse {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  error?: {
    message?: string;
    code?: number;
  };
}

export class FacebookOAuthProvider implements IOAuthProvider {
  readonly provider: AuthProvider = AuthProvider.FACEBOOK;

  async verify(payload: OAuthPayloadInput): Promise<OAuthUserProfile> {
    const accessToken = payload.accessToken || payload.token;

    if (!accessToken) {
      throw ApiError.badRequest('Facebook authentication requires an accessToken.');
    }

    try {
      const url = `https://graph.facebook.com/me?fields=id,first_name,last_name,name,email,picture.type(large)&access_token=${encodeURIComponent(
        accessToken,
      )}`;

      const response = await fetch(url);
      const data = (await response.json()) as FacebookProfileResponse;

      if (!response.ok || data.error || !data.id) {
        throw new Error(data.error?.message || 'Failed to fetch Facebook profile');
      }

      // In case user registered without email or declined email permission
      const email = data.email
        ? data.email.toLowerCase()
        : `fb_${data.id}@facebook.placeholder`;

      const firstName = data.first_name || data.name?.split(' ')[0] || 'Facebook User';
      const lastName = data.last_name || (data.name?.split(' ').slice(1).join(' ') || null);
      const image = data.picture?.data?.url || null;

      return {
        provider: this.provider,
        providerId: data.id,
        email,
        firstName,
        lastName,
        image,
        isEmailVerified: !!data.email, // If email provided by FB, it's verified
        rawProfile: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      logger.error('[FacebookOAuth] Verification failed:', error);
      throw ApiError.unauthorized('Invalid or expired Facebook access token.');
    }
  }
}
