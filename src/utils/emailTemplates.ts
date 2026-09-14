import {
  EmailOtpTemplateData,
  EmailLinkTemplateData,
  PasswordResetTemplateData,
} from '../types/mail.types';
import { env } from '../config/env';

/**
 * Base wrapper for consistent branding and responsive email layout.
 */
function wrapEmailLayout(title: string, contentHtml: string): string {
  const appName = env.EMAIL_FROM_NAME || 'Node Boilerplate';
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f5f7;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f4f5f7;
      padding: 40px 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.6;
      font-size: 15px;
      color: #374151;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .otp-card {
      background-color: #f8fafc;
      border: 2px dashed #93c5fd;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #1d4ed8;
      margin: 8px 0;
      display: inline-block;
    }
    .otp-expiry {
      font-size: 13px;
      color: #6b7280;
      margin-top: 8px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
    }
    .footer {
      background-color: #f9fafb;
      border-top: 1px solid #f3f4f6;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .warning {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      font-size: 13px;
      color: #92400e;
      border-radius: 4px;
      margin: 24px 0 0 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${appName}</h1>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>This is an automated message from ${appName}. Please do not reply directly to this email.</p>
        <p>&copy; ${year} ${appName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render email verification OTP template
 */
export function renderEmailOtpTemplate(data: EmailOtpTemplateData): {
  html: string;
  text: string;
} {
  const content = `
    <p class="greeting">Hello ${data.name || 'there'},</p>
    <p>Thank you for signing up! To complete your account verification, please enter the one-time verification code below:</p>
    <div class="otp-card">
      <div class="otp-label">Your Verification Code</div>
      <div class="otp-code">${data.otp}</div>
      <div class="otp-expiry">Valid for the next ${data.expiryMinutes} minutes</div>
    </div>
    <div class="warning">
      <strong>Security note:</strong> Never share this code with anyone. Our support team will never ask you for your verification code.
    </div>
  `;

  const text = `
Hello ${data.name || 'there'},

Your verification code is: ${data.otp}

This code is valid for ${data.expiryMinutes} minutes.

If you did not request this code, please ignore this email.
  `.trim();

  return {
    html: wrapEmailLayout('Verify Your Email Address', content),
    text,
  };
}

/**
 * Render verification link template
 */
export function renderEmailLinkTemplate(data: EmailLinkTemplateData): {
  html: string;
  text: string;
} {
  const content = `
    <p class="greeting">Hello ${data.name || 'there'},</p>
    <p>Please confirm your email address by clicking the button below:</p>
    <div class="btn-container">
      <a href="${data.verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
    </div>
    <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
      Or copy and paste this link into your browser:<br>
      <a href="${data.verificationUrl}" style="color: #2563eb;">${data.verificationUrl}</a>
    </p>
    <div class="warning">
      If you did not create an account, you can safely ignore this email.
    </div>
  `;

  const text = `
Hello ${data.name || 'there'},

Please verify your email address by visiting this link:
${data.verificationUrl}

If you did not create an account, please ignore this email.
  `.trim();

  return {
    html: wrapEmailLayout('Confirm Your Email', content),
    text,
  };
}

/**
 * Render password reset template
 */
export function renderPasswordResetTemplate(data: PasswordResetTemplateData): {
  html: string;
  text: string;
} {
  const isCode = data.tokenOrOtp.length <= 8 && /^[0-9]+$/.test(data.tokenOrOtp);

  const codeOrButton = isCode
    ? `
      <div class="otp-card">
        <div class="otp-label">Password Reset Code</div>
        <div class="otp-code">${data.tokenOrOtp}</div>
        <div class="otp-expiry">Valid for ${data.expiryMinutes} minutes</div>
      </div>
    `
    : data.resetUrl
      ? `
      <div class="btn-container">
        <a href="${data.resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
        Or use this link: <a href="${data.resetUrl}" style="color: #2563eb;">${data.resetUrl}</a>
      </p>
    `
      : `
      <div class="otp-card">
        <div class="otp-label">Reset Token</div>
        <div style="font-family: monospace; font-size: 18px; color: #1d4ed8; word-break: break-all;">${data.tokenOrOtp}</div>
        <div class="otp-expiry">Valid for ${data.expiryMinutes} minutes</div>
      </div>
    `;

  const content = `
    <p class="greeting">Hello ${data.name || 'there'},</p>
    <p>We received a request to reset the password for your account. Use the code below to complete the reset:</p>
    ${codeOrButton}
    <div class="warning">
      <strong>Important:</strong> If you did not request a password reset, please change your password immediately or contact support.
    </div>
  `;

  const text = `
Hello ${data.name || 'there'},

We received a request to reset your password.
Your reset code or token is: ${data.tokenOrOtp}

This is valid for ${data.expiryMinutes} minutes.

If you did not request this, please ignore this email.
  `.trim();

  return {
    html: wrapEmailLayout('Password Reset Request', content),
    text,
  };
}
