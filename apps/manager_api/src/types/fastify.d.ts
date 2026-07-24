import type { User, UserRole } from '@core/common/types/user.js';
import type { AppDatabase } from '@core/plugins/database/index.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { user_id: string; module: 'manager'; role: UserRole };
    user: { user_id: string; module: 'manager'; role: UserRole };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser?: User;
  }

  interface FastifyInstance {
    authenticateJwt: (
      request: FastifyRequest,
      reply: FastifyReply,
      allowedRoles: UserRole[]
    ) => Promise<void>;
    DatabaseRw: AppDatabase;
    DatabaseRo: AppDatabase;
    dbPool: Pool;
  }
}
