import type { User } from '@core/common/types/user.js';
import type { PermissionAction } from '@core/common/types/permission.js';
import type { AppDatabase } from '@core/plugins/database/index.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      user_id?: string;
      module?: 'manager';
      session_version?: number;
      email?: string;
      token_purpose?: 'password_reset' | 'registration_email';
    };
    user: {
      user_id?: string;
      module?: 'manager';
      session_version?: number;
      email?: string;
      token_purpose?: 'password_reset' | 'registration_email';
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser?: User;
    verifiedRegistrationEmail?: string;
  }

  interface FastifyInstance {
    authenticateJwt: (
      request: FastifyRequest,
      reply: FastifyReply,
      allowedPermissions: PermissionAction[]
    ) => Promise<void>;
    authenticatePasswordReset: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authenticateRegistrationEmail: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    DatabaseRw: AppDatabase;
    DatabaseRo: AppDatabase;
    dbPool: Pool;
  }
}

export {};
