import { Request, Response, NextFunction } from 'express';
import { oauthService } from '../services/oauth.service';
import { ApiResponse } from '../utils/apiResponse';

export class OAuthController {
  /**
   * Handle social login / registration via Google, Facebook, or Apple.
   */
  async oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const { provider } = req.params;

      const result = await oauthService.authenticate(provider, req.body, clientIp);

      ApiResponse.success(
        res,
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful`,
        result,
      );
    } catch (error) {
      next(error);
    }
  }
}

export const oauthController = new OAuthController();
