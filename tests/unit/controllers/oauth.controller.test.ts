import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { OAuthController } from '../../../src/controllers/oauth.controller';
import { oauthService } from '../../../src/services/oauth.service';

vi.mock('../../../src/services/oauth.service', () => ({
  oauthService: {
    authenticate: vi.fn(),
  },
}));

describe('OAuthController', () => {
  let controller: OAuthController;

  const mockRes = () => {
    const res = {} as unknown as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new OAuthController();
  });

  it('oauthLogin: should authenticate with provider and return 200 OK', async () => {
    const req = {
      params: { provider: 'google' },
      body: { idToken: 'valid_google_token' },
      ip: '10.0.0.1',
    } as unknown as Request;
    const res = mockRes();
    const mockAuthResult = {
      user: { id: 'usr_g1', email: 'g@example.com' },
      tokens: { accessToken: 'at', refreshToken: 'rt' },
    };

    vi.mocked(oauthService.authenticate).mockResolvedValue(
      mockAuthResult as unknown as Awaited<ReturnType<typeof oauthService.authenticate>>,
    );

    await controller.oauthLogin(req, res, mockNext);

    expect(oauthService.authenticate).toHaveBeenCalledWith('google', req.body, '10.0.0.1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Google login successful',
        data: mockAuthResult,
      }),
    );
  });

  it('oauthLogin: should forward errors to next middleware', async () => {
    const req = {
      params: { provider: 'invalid_provider' },
      body: {},
      ip: '127.0.0.1',
    } as unknown as Request;
    const res = mockRes();
    const error = new Error('Unsupported provider');
    vi.mocked(oauthService.authenticate).mockRejectedValue(error);

    await controller.oauthLogin(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
