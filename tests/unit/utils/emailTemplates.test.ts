import { describe, it, expect } from 'vitest';
import {
  renderEmailOtpTemplate,
  renderEmailLinkTemplate,
  renderPasswordResetTemplate,
} from '../../../src/utils/emailTemplates';

describe('Email Templates', () => {
  describe('renderEmailOtpTemplate', () => {
    it('should render HTML and text containing the 6-digit OTP and recipient name', () => {
      const { html, text } = renderEmailOtpTemplate({
        name: 'Alex',
        otp: '492815',
        expiryMinutes: 10,
      });

      expect(html).toContain('Alex');
      expect(html).toContain('492815');
      expect(html).toContain('10 minutes');
      expect(html).toContain('Your Verification Code');

      expect(text).toContain('Alex');
      expect(text).toContain('492815');
      expect(text).toContain('10 minutes');
    });
  });

  describe('renderEmailLinkTemplate', () => {
    it('should render HTML with verification URL link', () => {
      const url = 'https://example.com/api/v1/auth/verify-email?token=abcdef123';
      const { html, text } = renderEmailLinkTemplate({
        name: 'Sarah',
        verificationUrl: url,
      });

      expect(html).toContain('Sarah');
      expect(html).toContain(url);
      expect(html).toContain('Verify Email Address');

      expect(text).toContain('Sarah');
      expect(text).toContain(url);
    });
  });

  describe('renderPasswordResetTemplate', () => {
    it('should render password reset code template', () => {
      const { html, text } = renderPasswordResetTemplate({
        name: 'David',
        tokenOrOtp: '827391',
        expiryMinutes: 15,
      });

      expect(html).toContain('David');
      expect(html).toContain('827391');
      expect(html).toContain('15 minutes');

      expect(text).toContain('David');
      expect(text).toContain('827391');
    });
  });
});
