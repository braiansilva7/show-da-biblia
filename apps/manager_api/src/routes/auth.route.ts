import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { AuthController } from '@/controllers/auth/index.js';
import { authenticatedPermissions } from '@/permissions/index.js';
import { currentUserSchema } from '@core/schema/auth/me/index.js';
import { loginSchema } from '@core/schema/auth/login/index.js';
import { checkUsernameAvailabilitySchema, registerPlayerSchema } from '@core/schema/auth/register/index.js';
import { requestRegistrationEmailCodeSchema, verifyRegistrationEmailCodeSchema } from '@core/schema/auth/register/email-verification.js';
import { updateOwnProfileSchema } from '@core/schema/auth/profile/index.js';
import { forgotPasswordResetPasswordSchema, forgotPasswordSendCodeSchema, forgotPasswordVerifyCodeSchema } from '@core/schema/auth/forgot-password/index.js';

export default function authRoutes(server: FastifyInstance) {
  const authController = container.resolve(AuthController);
  server.post('/auth/login', {
    schema: loginSchema,
    handler: authController.login,
  });
  server.post('/auth/register', {
    schema: registerPlayerSchema,
    handler: authController.register,
    preHandler: [(request, reply) => server.authenticateRegistrationEmail(request, reply)],
  });
  server.post('/auth/register/check-username', {
    schema: checkUsernameAvailabilitySchema,
    handler: authController.checkUsernameAvailability,
  });
  server.post('/auth/register/request-email-code', {
    schema: requestRegistrationEmailCodeSchema,
    handler: authController.requestRegistrationEmailCode,
  });
  server.post('/auth/register/verify-email-code', {
    schema: verifyRegistrationEmailCodeSchema,
    handler: authController.verifyRegistrationEmailCode,
  });
  server.post('/auth/forgot-password/send-code', {
    schema: forgotPasswordSendCodeSchema,
    handler: authController.forgotPasswordSendCode,
  });
  server.post('/auth/forgot-password/verify-code', {
    schema: forgotPasswordVerifyCodeSchema,
    handler: authController.forgotPasswordVerifyCode,
  });
  server.post('/auth/forgot-password/reset-password', {
    schema: forgotPasswordResetPasswordSchema,
    handler: authController.forgotPasswordResetPassword,
    preHandler: [(request, reply) => server.authenticatePasswordReset(request, reply)],
  });
  server.get('/auth/me', {
    schema: currentUserSchema,
    handler: authController.currentUser,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, authenticatedPermissions),
    ],
  });
  server.patch('/auth/me', {
    schema: updateOwnProfileSchema,
    handler: authController.updateCurrentUser,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, authenticatedPermissions),
    ],
  });
}
