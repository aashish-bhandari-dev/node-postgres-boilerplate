import { IMailTransport, MailSendResult, SendMailOptions } from '../types/mail.types';
import { createMailTransport } from '../transports/mail.transport';
import {
  renderEmailOtpTemplate,
  renderEmailLinkTemplate,
  renderPasswordResetTemplate,
} from '../utils/emailTemplates';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class MailService {
  private transport: IMailTransport;

  constructor(transport?: IMailTransport) {
    this.transport = transport || createMailTransport();
  }

  /**
   * Swap mail transport dynamically (useful for unit tests or switching providers at runtime).
   */
  setTransport(transport: IMailTransport): void {
    this.transport = transport;
  }

  /**
   * Generic send method.
   */
  async send(options: SendMailOptions): Promise<MailSendResult> {
    try {
      return await this.transport.sendMail(options);
    } catch (error) {
      logger.error(`[MailService] Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send 6-digit verification OTP code to user's email.
   */
  async sendEmailVerificationOtp(
    to: string,
    name: string,
    otp: string,
    expiryMinutes: number = env.EMAIL_OTP_EXPIRES_MINUTES,
  ): Promise<MailSendResult> {
    const { html, text } = renderEmailOtpTemplate({
      name,
      otp,
      expiryMinutes,
    });

    return this.send({
      to,
      subject: `Your Verification Code: ${otp}`,
      html,
      text,
    });
  }

  /**
   * Send email verification link.
   */
  async sendEmailVerificationLink(
    to: string,
    name: string,
    verificationUrl: string,
  ): Promise<MailSendResult> {
    const { html, text } = renderEmailLinkTemplate({
      name,
      verificationUrl,
    });

    return this.send({
      to,
      subject: 'Verify your email address',
      html,
      text,
    });
  }

  /**
   * Send password reset code or link.
   */
  async sendPasswordReset(
    to: string,
    name: string,
    tokenOrOtp: string,
    expiryMinutes: number = env.AUTH_OTP_EXPIRES_MINUTES,
    resetUrl?: string,
  ): Promise<MailSendResult> {
    const { html, text } = renderPasswordResetTemplate({
      name,
      tokenOrOtp,
      expiryMinutes,
      resetUrl,
    });

    return this.send({
      to,
      subject: 'Reset your password',
      html,
      text,
    });
  }
}

export const mailService = new MailService();
