import { JsonResource } from './base.resource';

export interface UserResourceData {
  id: string;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  email: string;
  phone?: string | null;
  image?: string | null;
  bio?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  locale?: string;
  timezone?: string;
  role: string;
  isActive: boolean;
  isDeactivated: boolean;
  deletedAt?: Date | string | null;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date | string | null;
  isPhoneVerified: boolean;
  phoneVerifiedAt?: Date | string | null;
  provider: string;
  lastLoginAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * Formats user responses, automatically hiding sensitive fields:
 * (password, resetOtpHash, resetOtpExpiresAt, refreshTokenHash, emailVerificationToken).
 */
export class UserResource extends JsonResource<UserResourceData> {
  toArray(): Record<string, unknown> {
    return {
      id: this.resource.id,
      firstName: this.resource.firstName,
      lastName: this.resource.lastName ?? null,
      fullName: [this.resource.firstName, this.resource.lastName].filter(Boolean).join(' '),
      username: this.resource.username ?? null,
      email: this.resource.email,
      phone: this.resource.phone ?? null,
      image: this.resource.image ?? null,
      bio: this.resource.bio ?? null,
      gender: this.resource.gender ?? null,
      dateOfBirth: this.resource.dateOfBirth ?? null,
      locale: this.resource.locale ?? 'en',
      timezone: this.resource.timezone ?? 'UTC',
      role: this.resource.role,
      isActive: this.resource.isActive,
      isDeactivated: this.resource.isDeactivated,
      isEmailVerified: this.resource.isEmailVerified,
      emailVerifiedAt: this.resource.emailVerifiedAt ?? null,
      isPhoneVerified: this.resource.isPhoneVerified,
      phoneVerifiedAt: this.resource.phoneVerifiedAt ?? null,
      provider: this.resource.provider,
      lastLoginAt: this.resource.lastLoginAt ?? null,
      metadata: this.resource.metadata ?? {},
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    };
  }
}
