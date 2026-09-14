export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  previewUrl?: string | false;
}

export interface IMailTransport {
  name: string;
  sendMail(options: SendMailOptions): Promise<MailSendResult>;
}

export interface EmailOtpTemplateData {
  name: string;
  otp: string;
  expiryMinutes: number;
}

export interface EmailLinkTemplateData {
  name: string;
  verificationUrl: string;
}

export interface PasswordResetTemplateData {
  name: string;
  tokenOrOtp: string;
  expiryMinutes: number;
  resetUrl?: string;
}
