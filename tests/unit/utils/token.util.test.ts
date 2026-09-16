import { describe, it, expect } from 'vitest';
import { UserRole } from '../../../src/constants/roles';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateAuthTokens,
  generateRandomToken,
  generateNumericOtp,
  hashToken,
} from '../../../src/utils/token.util';

describe('Token Utility', () => {
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  describe('JWT Access Token', () => {
    it('should generate and verify a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      expect(typeof token).toBe('string');

      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.email).toBe(mockPayload.email);
      expect(verified.role).toBe(mockPayload.role);
      expect(verified.iat).toBeDefined();
      expect(verified.exp).toBeDefined();
    });

    it('should throw an error when verifying a tampered token', () => {
      const token = generateAccessToken(mockPayload);
      const tampered = token.slice(0, -5) + 'abcde';

      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('JWT Refresh Token', () => {
    it('should generate and verify a valid refresh token', () => {
      const token = generateRefreshToken({ userId: mockPayload.userId });
      expect(typeof token).toBe('string');

      const verified = verifyRefreshToken(token);
      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.exp).toBeDefined();
    });
  });

  describe('generateAuthTokens', () => {
    it('should generate a token pair with metadata', () => {
      const tokens = generateAuthTokens(mockPayload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBeDefined();
    });
  });

  describe('generateRandomToken', () => {
    it('should generate secure random hex string of given bytes', () => {
      const token32 = generateRandomToken(32);
      expect(token32.length).toBe(64); // 32 bytes = 64 hex characters

      const token16 = generateRandomToken(16);
      expect(token16.length).toBe(32);
      expect(token32).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateNumericOtp', () => {
    it('should generate numeric string of given length', () => {
      const otp6 = generateNumericOtp(6);
      expect(otp6.length).toBe(6);
      expect(otp6).toMatch(/^\d{6}$/);

      const otp4 = generateNumericOtp(4);
      expect(otp4.length).toBe(4);
      expect(otp4).toMatch(/^\d{4}$/);
    });

    it('should generate unique values across calls', () => {
      const otp1 = generateNumericOtp(6);
      const otp2 = generateNumericOtp(6);
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('hashToken', () => {
    it('should generate a consistent SHA-256 hex digest', () => {
      const token = 'my-secret-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // 64 hex chars
    });
  });
});
