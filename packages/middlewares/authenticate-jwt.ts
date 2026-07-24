import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import type { UserRole } from '@core/common/types/user.js';
import { UserRepository } from '@core/repositories/user/user.repository.js';

export function registerAuthenticateJwt(server: FastifyInstance) {
  server.decorate(
    'authenticateJwt',
    async (request: FastifyRequest, reply: FastifyReply, allowedRoles: UserRole[]) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({ message: request.t('auth_invalid_or_expired_token') });
        return;
      }

      const userRepository = container.resolve(UserRepository);
      const user = await userRepository.findById(request.user.user_id);
      if (!user || !user.active) {
        reply.code(401).send({ message: request.t('auth_unauthorized_user') });
        return;
      }
      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        reply.code(403).send({ message: request.t('auth_admin_access_only') });
        return;
      }
      request.authenticatedUser = user;
    }
  );
}
