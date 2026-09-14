import crypto from 'crypto';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { env } from '../config/env';
import { AccessTokenPayload, RefreshTokenPayload, AuthTokens } from '../types/auth.types';

/**
 * Generate a cryptographically secure random hex string token (e.g. for email verification).
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a cryptographically secure numeric OTP (e.g. 6-digit code for SMS/Phone verification).
 */
export function generateNumericOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

/**
 * One-way hash for tokens/OTPs (SHA-256) before storing in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate signed JWT access token.
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, options);
}

/**
 * Generate signed JWT refresh token.
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options);
}

/**
 * Verify and decode an access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET as Secret) as RefreshTokenPayload;
}

/**
 * Generate an access and refresh token pair along with metadata.
 */
export function generateAuthTokens(userPayload: AccessTokenPayload): AuthTokens {
  const accessToken = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken({ userId: userPayload.userId });

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    tokenType: 'Bearer',
  };
}
