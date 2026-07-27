import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { UserRepository } from '@core/repositories/user/user.repository.js';

export function registerAuthenticatePasswordReset(server: FastifyInstance) {
  server.decorate(
    'authenticatePasswordReset',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply
          .code(401)
          .send({ message: request.t('auth_invalid_or_expired_token') });
        return;
      }
      if (request.user.token_purpose !== 'password_reset' || !request.user.user_id || request.user.session_version === undefined) {
        reply
          .code(401)
          .send({ message: request.t('auth_invalid_or_expired_token') });
        return;
      }
      const user = await container
        .resolve(UserRepository)
        .findById(request.user.user_id);
      if (
        !user ||
        !user.active ||
        user.sessionVersion !== request.user.session_version
      ) {
        reply
          .code(401)
          .send({ message: request.t('auth_invalid_or_expired_token') });
        return;
      }
      request.authenticatedUser = user;
    }
  );
}
