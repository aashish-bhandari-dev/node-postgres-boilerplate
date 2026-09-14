import nodemailer, { Transporter } from 'nodemailer';
import { IMailTransport, MailSendResult, SendMailOptions } from '../types/mail.types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Real SMTP Transport using nodemailer.
 */
export class SmtpMailTransport implements IMailTransport {
  name = 'SMTP';
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
    });
  }

  async sendMail(options: SendMailOptions): Promise<MailSendResult> {
    const from = options.from || `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`;

    const info = await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    });

    logger.info(
      `[Mail:SMTP] Sent email to "${options.to}" | Subject: "${options.subject}" | MessageId: ${info.messageId}`,
    );

    return {
      success: true,
      messageId: info.messageId,
      recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    };
  }
}

/**
 * Console / Mock Transport for local development and testing when SMTP credentials are not configured.
 */
export class ConsoleMailTransport implements IMailTransport {
  name = 'Console/Dev';

  async sendMail(options: SendMailOptions): Promise<MailSendResult> {
    const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.info('📧 ================== [MOCK EMAIL SENT] ==================');
    logger.info(`📧 To:      ${recipient}`);
    logger.info(`📧 Subject: ${options.subject}`);
    if (options.text) {
      logger.info(`📧 Content:\n${options.text}`);
    }
    logger.info('📧 =======================================================');

    return {
      success: true,
      messageId: mockId,
      recipient,
    };
  }
}

/**
 * Factory that selects SMTP if configured, or falls back to Console in dev.
 */
export function createMailTransport(): IMailTransport {
  if (env.SMTP_HOST && env.SMTP_HOST.trim().length > 0) {
    logger.info(
      `[Mail] Initialized SMTP transport with host: ${env.SMTP_HOST}:${env.SMTP_PORT}`,
    );
    return new SmtpMailTransport();
  }

  logger.info('[Mail] No SMTP_HOST configured. Using Console / Dev Mail Transport.');
  return new ConsoleMailTransport();
}
