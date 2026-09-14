import { AuthProvider } from '@prisma/client';
import { IOAuthProvider } from '../../types/oauth.types';
import { GoogleOAuthProvider } from './google.provider';
import { FacebookOAuthProvider } from './facebook.provider';
import { AppleOAuthProvider } from './apple.provider';

export * from './google.provider';
export * from './facebook.provider';
export * from './apple.provider';

export const defaultOAuthProviders: Record<string, IOAuthProvider> = {
  google: new GoogleOAuthProvider(),
  facebook: new FacebookOAuthProvider(),
  apple: new AppleOAuthProvider(),
  [AuthProvider.GOOGLE.toLowerCase()]: new GoogleOAuthProvider(),
  [AuthProvider.FACEBOOK.toLowerCase()]: new FacebookOAuthProvider(),
  [AuthProvider.APPLE.toLowerCase()]: new AppleOAuthProvider(),
};
