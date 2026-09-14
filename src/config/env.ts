import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('localhost'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),

  // Authentication & Security
  JWT_ACCESS_SECRET: z.string().default('default_access_secret_change_in_production'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('default_refresh_secret_change_in_production'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Verification Toggles
  AUTH_REQUIRE_EMAIL_VERIFICATION: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  AUTH_REQUIRE_PHONE_VERIFICATION: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),

  // Account Security & Lockout
  AUTH_MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  AUTH_LOCKOUT_DURATION_MINUTES: z.coerce.number().default(15),
  AUTH_EMAIL_TOKEN_EXPIRES_HOURS: z.coerce.number().default(24),
  AUTH_OTP_EXPIRES_MINUTES: z.coerce.number().default(10),

  // Email & SMTP Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Node Boilerplate'),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@example.com'),
  EMAIL_VERIFICATION_TYPE: z.enum(['otp', 'link']).default('otp'),
  EMAIL_OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
