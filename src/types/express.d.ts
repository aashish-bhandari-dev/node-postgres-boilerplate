import { User } from '@prisma/client';
import { AccessTokenPayload } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: AccessTokenPayload;
    }
  }
}

export {};
