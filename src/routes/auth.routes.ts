import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { oauthController } from '../controllers/oauth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { oauthLoginSchema } from '../validations/oauth.validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  sendPhoneOtpSchema,
  verifyPhoneSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateMeSchema,
} from '../validations/auth.validation';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, email, password]
 *             properties:
 *               firstName: { type: string, example: 'Jane' }
 *               lastName: { type: string, example: 'Doe' }
 *               username: { type: string, example: 'janedoe' }
 *               email: { type: string, format: email, example: 'jane.doe@example.com' }
 *               password: { type: string, minLength: 6, example: 'Password123!' }
 *               phone: { type: string, example: '+1234567890' }
 *               locale: { type: string, example: 'en' }
 *               timezone: { type: string, example: 'UTC' }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already in use
 */
router.post('/register', validateRequest(registerSchema), authController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in with email, username, or phone
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: 'jane.doe@example.com', description: 'Email, username, or phone number' }
 *               password: { type: string, example: 'Password123!' }
 *     responses:
 *       200:
 *         description: Logged in successfully, returns JWT access and refresh tokens
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated or unverified email/phone (if toggles enabled)
 *       423:
 *         description: Account temporarily locked due to failed attempts
 */
router.post('/login', validateRequest(loginSchema), authController.login);

/**
 * @openapi
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT access token using a refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access and refresh token pair
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  '/refresh-token',
  validateRequest(refreshTokenSchema),
  authController.refreshToken,
);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out current user and invalidate refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate(), authController.logout);

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address with verification token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/verify-email',
  validateRequest(verifyEmailSchema),
  authController.verifyEmail,
);

/**
 * @openapi
 * /api/v1/auth/resend-verification-email:
 *   post:
 *     summary: Resend email verification link/token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Verification link resent
 */
router.post(
  '/resend-verification-email',
  validateRequest(resendVerificationEmailSchema),
  authController.resendVerificationEmail,
);

/**
 * @openapi
 * /api/v1/auth/send-email-otp:
 *   post:
 *     summary: Send a 6-digit verification OTP code to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: 'user@example.com' }
 *     responses:
 *       200:
 *         description: Verification OTP code sent to email
 *       400:
 *         description: Email is already verified
 */
router.post(
  '/send-email-otp',
  validateRequest(sendEmailOtpSchema),
  authController.sendEmailOtp,
);

/**
 * @openapi
 * /api/v1/auth/verify-email-otp:
 *   post:
 *     summary: Verify email address using the 6-digit numeric OTP code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email, example: 'user@example.com' }
 *               otp: { type: string, example: '123456', description: '6-digit numeric OTP' }
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP code
 */
router.post(
  '/verify-email-otp',
  validateRequest(verifyEmailOtpSchema),
  authController.verifyEmailOtp,
);

/**
 * @openapi
 * /api/v1/auth/send-phone-otp:
 *   post:
 *     summary: Send OTP code for phone number verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: '+1234567890' }
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       404:
 *         description: Phone number not found
 */
router.post(
  '/send-phone-otp',
  validateRequest(sendPhoneOtpSchema),
  authController.sendPhoneOtp,
);

/**
 * @openapi
 * /api/v1/auth/verify-phone:
 *   post:
 *     summary: Verify phone number with 6-digit OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone: { type: string, example: '+1234567890' }
 *               otp: { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: Phone number verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  '/verify-phone',
  validateRequest(verifyPhoneSchema),
  authController.verifyPhone,
);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset link / OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Password reset instructions sent
 */
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token / OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, tokenOrOtp, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               tokenOrOtp: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  authController.resetPassword,
);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get profile of authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update profile of authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               username: { type: string }
 *               phone: { type: string }
 *               bio: { type: string }
 *               image: { type: string, format: uri }
 *               gender: { type: string }
 *               dateOfBirth: { type: string, format: date-time }
 *               locale: { type: string }
 *               timezone: { type: string }
 *               metadata: { type: object }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router
  .route('/me')
  .get(authenticate(), authController.getMe)
  .patch(authenticate(), validateRequest(updateMeSchema), authController.updateMe);

/**
 * @openapi
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/change-password',
  authenticate(),
  validateRequest(changePasswordSchema),
  authController.changePassword,
);

/**
 * @openapi
 * /api/v1/auth/oauth/{provider}:
 *   post:
 *     summary: Social login or registration via Google, Facebook, or Apple
 *     description: Authenticates or registers a user via social identity providers. Email is automatically verified. Returns JWT access & refresh tokens.
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, facebook, apple]
 *         description: The social auth provider name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Identity token (used by Google and Apple)
 *               accessToken:
 *                 type: string
 *                 description: User access token (used by Facebook)
 *               token:
 *                 type: string
 *                 description: Fallback token parameter
 *               code:
 *                 type: string
 *                 description: Server-side authorization code (Google)
 *               redirectUri:
 *                 type: string
 *                 description: Redirect URI used when generating code
 *               user:
 *                 type: object
 *                 description: Optional user profile payload returned by Apple on initial sign-in
 *                 properties:
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName: { type: string }
 *                       lastName: { type: string }
 *                   email: { type: string }
 *     responses:
 *       200:
 *         description: Logged in successfully, returns user profile and JWT tokens
 *       400:
 *         description: Validation error or missing token
 *       401:
 *         description: Invalid or expired third-party token
 *       403:
 *         description: User account is disabled or deactivated
 */
router.post(
  '/oauth/:provider',
  validateRequest(oauthLoginSchema),
  oauthController.oauthLogin,
);

export default router;
