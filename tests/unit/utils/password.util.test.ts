import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../../src/utils/password.util';

describe('Password Utility', () => {
  it('should hash a password successfully', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(rawPassword);
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
  });

  it('should return true when comparing correct password with its hash', async () => {
    const rawPassword = 'CorrectPassword123!';
    const hash = await hashPassword(rawPassword);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should return false when comparing incorrect password with hash', async () => {
    const rawPassword = 'CorrectPassword123!';
    const wrongPassword = 'WrongPassword456!';
    const hash = await hashPassword(rawPassword);

    const isMatch = await comparePassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });

  it('should produce unique salt hashes for the same password', async () => {
    const rawPassword = 'SamePassword123!';
    const hash1 = await hashPassword(rawPassword);
    const hash2 = await hashPassword(rawPassword);

    expect(hash1).not.toBe(hash2);
    expect(await comparePassword(rawPassword, hash1)).toBe(true);
    expect(await comparePassword(rawPassword, hash2)).toBe(true);
  });
});
