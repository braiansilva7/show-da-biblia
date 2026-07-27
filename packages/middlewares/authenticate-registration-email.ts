import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function registerAuthenticateRegistrationEmail(server: FastifyInstance) {
  server.decorate('authenticateRegistrationEmail', async (request: FastifyRequest, reply: FastifyReply) => {
    try { await request.jwtVerify(); } catch {
      reply.code(401).send({ message: request.t('registration_email_verification_required') });
      return;
    }
    if (request.user.token_purpose !== 'registration_email' || !request.user.email) {
      reply.code(401).send({ message: request.t('registration_email_verification_required') });
      return;
    }
    request.verifiedRegistrationEmail = request.user.email;
  });
}
