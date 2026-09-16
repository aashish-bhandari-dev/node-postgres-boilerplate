import { User, UserPermission, Permission } from '@prisma/client';
import { AccessTokenPayload } from './auth.types';

export type UserWithPermissions = Omit<User, 'roleId'> & {
  roleId: string;
  role?: string | { id: string; name: string; displayName: string; hierarchy: number; isSystem: boolean } | null;
  roleName?: string;
  roleHierarchy?: number;
  rolePermissions?: string[];
  userPermissions?: (UserPermission & { permission?: Permission | null })[];
  permissions?: string[];
  deniedPermissions?: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: UserWithPermissions;
      tokenPayload?: AccessTokenPayload;
    }
  }
}

export {};
