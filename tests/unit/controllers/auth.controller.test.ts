import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { AuthController } from '../../../src/controllers/auth.controller';
import { authService } from '../../../src/services/auth.service';
import { ApiError } from '../../../src/utils/apiError';

vi.mock('../../../src/services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationEmail: vi.fn(),
    sendEmailOtp: vi.fn(),
    verifyEmailOtp: vi.fn(),
    sendPhoneOtp: vi.fn(),
    verifyPhone: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    getMe: vi.fn(),
    updateMe: vi.fn(),
  },
}));

describe('AuthController', () => {
  let controller: AuthController;

  const mockRes = () => {
    const res = {} as unknown as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController();
  });

  it('register: should call authService.register and respond with 201 Created', async () => {
    const req = {
      body: {
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'John',
      },
    } as unknown as Request;
    const res = mockRes();
    const mockResult = { user: { id: 'usr_1', email: 'user@example.com' }, tokens: {} };
    vi.mocked(authService.register).mockResolvedValue(
      mockResult as unknown as Awaited<ReturnType<typeof authService.register>>,
    );

    await controller.register(req, res, mockNext);

    expect(authService.register).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'User registered successfully',
        data: mockResult,
      }),
    );
  });

  it('register: should forward errors to next middleware', async () => {
    const req = { body: {} } as unknown as Request;
    const res = mockRes();
    const error = ApiError.conflict('User already exists');
    vi.mocked(authService.register).mockRejectedValue(error);

    await controller.register(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('login: should call authService.login and respond with 200 OK', async () => {
    const req = {
      body: { identifier: 'user@example.com', password: 'Password123!' },
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;
    const res = mockRes();
    const mockResult = { user: { id: 'usr_1' }, tokens: { accessToken: 'token' } };
    vi.mocked(authService.login).mockResolvedValue(
      mockResult as unknown as Awaited<ReturnType<typeof authService.login>>,
    );

    await controller.login(req, res, mockNext);

    expect(authService.login).toHaveBeenCalledWith(req.body, '127.0.0.1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Login successful',
        data: mockResult,
      }),
    );
  });

  it('refreshToken: should call authService.refreshToken and respond with 200 OK', async () => {
    const req = { body: { refreshToken: 'refresh_token_string' } } as unknown as Request;
    const res = mockRes();
    const mockTokens = { accessToken: 'new_access', refreshToken: 'new_refresh' };
    vi.mocked(authService.refreshToken).mockResolvedValue(
      mockTokens as unknown as Awaited<ReturnType<typeof authService.refreshToken>>,
    );

    await controller.refreshToken(req, res, mockNext);

    expect(authService.refreshToken).toHaveBeenCalledWith('refresh_token_string');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockTokens,
      }),
    );
  });

  it('logout: should call authService.logout when authenticated and return 200 OK', async () => {
    const req = { user: { id: 'usr_123' } } as unknown as Request;
    const res = mockRes();
    vi.mocked(authService.logout).mockResolvedValue();

    await controller.logout(req, res, mockNext);

    expect(authService.logout).toHaveBeenCalledWith('usr_123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Logged out successfully',
      }),
    );
  });

  it('logout: should pass ApiError.unauthorized to next when req.user is absent', async () => {
    const req = {} as unknown as Request;
    const res = mockRes();

    await controller.logout(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it('verifyEmailOtp: should call authService.verifyEmailOtp and return 200 OK', async () => {
    const req = { body: { email: 'test@example.com', otp: '123456' } } as unknown as Request;
    const res = mockRes();
    vi.mocked(authService.verifyEmailOtp).mockResolvedValue(
      { success: true } as unknown as Awaited<ReturnType<typeof authService.verifyEmailOtp>>,
    );

    await controller.verifyEmailOtp(req, res, mockNext);

    expect(authService.verifyEmailOtp).toHaveBeenCalledWith('test@example.com', '123456');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forgotPassword: should call authService.forgotPassword and return 200 OK', async () => {
    const req = { body: { email: 'reset@example.com' } } as unknown as Request;
    const res = mockRes();
    vi.mocked(authService.forgotPassword).mockResolvedValue({
      message: 'Reset instructions sent',
    });

    await controller.forgotPassword(req, res, mockNext);

    expect(authService.forgotPassword).toHaveBeenCalledWith('reset@example.com');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('resetPassword: should call authService.resetPassword and return 200 OK', async () => {
    const req = {
      body: {
        email: 'reset@example.com',
        tokenOrOtp: '123456',
        newPassword: 'NewPassword123!',
      },
    } as unknown as Request;
    const res = mockRes();
    vi.mocked(authService.resetPassword).mockResolvedValue();

    await controller.resetPassword(req, res, mockNext);

    expect(authService.resetPassword).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('Password has been reset successfully'),
      }),
    );
  });

  it('getMe: should return authenticated user profile', async () => {
    const req = { user: { id: 'usr_me' } } as unknown as Request;
    const res = mockRes();
    const mockUser = { id: 'usr_me', email: 'me@example.com' };
    vi.mocked(authService.getMe).mockResolvedValue(mockUser);

    await controller.getMe(req, res, mockNext);

    expect(authService.getMe).toHaveBeenCalledWith('usr_me');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { user: mockUser },
      }),
    );
  });
});
