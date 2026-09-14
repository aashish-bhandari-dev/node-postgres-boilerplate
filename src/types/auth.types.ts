import { UserRole } from '@prisma/client';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AccessTokenPayload extends JwtUserPayload {
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

export interface AuthenticateOptions {
  requireEmailVerified?: boolean;
  requirePhoneVerified?: boolean;
}

export interface RequireVerifiedOptions {
  email?: boolean;
  phone?: boolean;
  enforce?: boolean;
}

export interface AuthResponseData {
  user: Record<string, unknown>;
  tokens?: AuthTokens;
  requiresVerification?: {
    email: boolean;
    phone: boolean;
  };
  otp?: string;
}
