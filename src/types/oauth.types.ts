import { AuthProvider } from '@prisma/client';

export interface OAuthUserProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  image?: string | null;
  isEmailVerified: boolean;
  rawProfile?: Record<string, unknown>;
}

export interface OAuthPayloadInput {
  token?: string;
  idToken?: string;
  accessToken?: string;
  code?: string;
  redirectUri?: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

export interface IOAuthProvider {
  readonly provider: AuthProvider;
  verify(payload: OAuthPayloadInput): Promise<OAuthUserProfile>;
}
