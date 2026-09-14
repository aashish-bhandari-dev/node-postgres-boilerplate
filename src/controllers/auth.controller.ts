import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      ApiResponse.created(res, 'User registered successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log in user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await authService.login(req.body, clientIp);
      ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);
      ApiResponse.success(res, 'Token refreshed successfully', tokens);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      await authService.logout(req.user.id);
      ApiResponse.success(res, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email via token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.verifyEmail(req.body.token);
      ApiResponse.success(res, 'Email verified successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resendVerificationEmail(req.body.email);
      ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send 6-digit verification code to email
   */
  async sendEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendEmailOtp(req.body.email);
      ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email address using 6-digit numeric OTP code
   */
  async verifyEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyEmailOtp(req.body.email, req.body.otp);
      ApiResponse.success(res, 'Email address verified successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send phone verification OTP
   */
  async sendPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendPhoneOtp(req.body.phone);
      ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify phone number with OTP
   */
  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.verifyPhone(req.body.phone, req.body.otp);
      ApiResponse.success(res, 'Phone number verified successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body.email);
      ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body);
      ApiResponse.success(res, 'Password has been reset successfully. Please log in with your new password.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password for logged-in user
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      await authService.changePassword(req.user.id, req.body);
      ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const user = await authService.getMe(req.user.id);
      ApiResponse.success(res, 'Profile retrieved successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current authenticated user profile
   */
  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const user = await authService.updateMe(req.user.id, req.body);
      ApiResponse.success(res, 'Profile updated successfully', { user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
