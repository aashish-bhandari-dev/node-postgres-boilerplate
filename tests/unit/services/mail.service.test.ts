import { describe, it, expect, vi } from 'vitest';
import { MailService } from '../../../src/services/mail.service';
import { IMailTransport, MailSendResult, SendMailOptions } from '../../../src/types/mail.types';

describe('Mail Service', () => {
  it('should dispatch email verification OTP through the configured transport', async () => {
    const sendMailMock = vi.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-123',
      recipient: 'test@example.com',
    } as MailSendResult);

    const mockTransport: IMailTransport = {
      name: 'TestMock',
      sendMail: sendMailMock,
    };

    const mailService = new MailService(mockTransport);

    const result = await mailService.sendEmailVerificationOtp(
      'test@example.com',
      'TestUser',
      '849201',
      10,
    );

    expect(result.success).toBe(true);
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const sentOptions = sendMailMock.mock.calls[0][0] as SendMailOptions;
    expect(sentOptions.to).toBe('test@example.com');
    expect(sentOptions.subject).toContain('849201');
    expect(sentOptions.html).toContain('849201');
    expect(sentOptions.text).toContain('849201');
  });

  it('should dispatch password reset code through the configured transport', async () => {
    const sendMailMock = vi.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-456',
      recipient: 'reset@example.com',
    } as MailSendResult);

    const mockTransport: IMailTransport = {
      name: 'TestMock',
      sendMail: sendMailMock,
    };

    const mailService = new MailService(mockTransport);

    const result = await mailService.sendPasswordReset(
      'reset@example.com',
      'ResetUser',
      '554433',
    );

    expect(result.success).toBe(true);
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const sentOptions = sendMailMock.mock.calls[0][0] as SendMailOptions;
    expect(sentOptions.to).toBe('reset@example.com');
    expect(sentOptions.subject).toContain('Reset your password');
    expect(sentOptions.html).toContain('554433');
  });

  it('should allow hot-swapping transport via setTransport', async () => {
    const transport1: IMailTransport = {
      name: 'Transport1',
      sendMail: vi.fn().mockResolvedValue({ success: true, recipient: 'a@b.com' }),
    };
    const transport2: IMailTransport = {
      name: 'Transport2',
      sendMail: vi.fn().mockResolvedValue({ success: true, recipient: 'a@b.com' }),
    };

    const mailService = new MailService(transport1);
    await mailService.send({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });
    expect(transport1.sendMail).toHaveBeenCalledTimes(1);
    expect(transport2.sendMail).not.toHaveBeenCalled();

    mailService.setTransport(transport2);
    await mailService.send({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });
    expect(transport2.sendMail).toHaveBeenCalledTimes(1);
  });
});
