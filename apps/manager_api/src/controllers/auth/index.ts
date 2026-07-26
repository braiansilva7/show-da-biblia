import type { FastifyReply, FastifyRequest } from 'fastify';
import { injectable, inject } from 'tsyringe';
import { managerApiEnvironment } from '@core/config/environments.js';
import { toPublicUser } from '@core/common/functions/to-public-user.js';
import { LoginUseCase } from '@core/useCases/auth/Login.usecase.js';
import { RegisterPlayerUseCase } from '@core/useCases/auth/RegisterPlayer.usecase.js';
import { UpdateOwnProfileUseCase } from '@core/useCases/auth/UpdateOwnProfile.usecase.js';
import type { LoginRequest } from '@core/schema/auth/login/request.schema.js';
import { parseUserMultipart } from '@core/schema/user/parseUserRequest.js';
import { parseRegisterPlayerInput } from '@core/schema/auth/register/index.js';
import { parseOwnProfileInput } from '@core/schema/auth/profile/index.js';
import { postgresErrorCode } from '@core/common/functions/postgres-error-code.js';
import type { IProfilePicture } from '@core/interfaces/user/IProfilePicture.js';
import { PasswordResetService } from '@core/services/password-reset.service.js';
import type { ForgotPasswordResetPasswordRequest, ForgotPasswordSendCodeRequest, ForgotPasswordVerifyCodeRequest } from '@core/schema/auth/forgot-password/index.js';

@injectable()
export class AuthController {
  constructor(
    @inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @inject(RegisterPlayerUseCase)
    private readonly registerPlayerUseCase: RegisterPlayerUseCase,
    @inject(UpdateOwnProfileUseCase)
    private readonly updateOwnProfileUseCase: UpdateOwnProfileUseCase,
    @inject(PasswordResetService)
    private readonly passwordResetService: PasswordResetService
  ) {}

  private async readProfileRequest(request: FastifyRequest): Promise<{
    fields: Record<string, unknown>;
    profilePicture: IProfilePicture | null;
  }> {
    return parseUserMultipart(request);
  }

  private issueToken(
    reply: FastifyReply,
    user: Awaited<ReturnType<LoginUseCase['execute']>>
  ) {
    const config = managerApiEnvironment();
    return reply
      .jwtSign({ user_id: user!.id, module: 'manager', session_version: user!.sessionVersion })
      .then((accessToken) => ({
        access_token: accessToken,
        token_type: 'Bearer' as const,
        expires_in: config.jwtSecretExpiresIn,
        user: toPublicUser(user!),
      }));
  }

  public login = async (
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ) => {
    const { email, password } = request.body;
    if (!email || !password) {
      return reply
        .code(400)
        .send({ message: request.t('auth_credentials_required') });
    }

    const user = await this.loginUseCase.execute(email, password);
    if (!user)
      return reply
        .code(401)
        .send({ message: request.t('auth_invalid_credentials') });

    return this.issueToken(reply, user);
  };

  public register = async (request: FastifyRequest, reply: FastifyReply) => {
    let fields: Record<string, unknown>;
    let profilePicture: IProfilePicture | null;
    try {
      ({ fields, profilePicture } = await this.readProfileRequest(request));
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE')
        return reply
          .code(400)
          .send({ message: request.t('profile_picture_too_large') });
      throw error;
    }
    const input = parseRegisterPlayerInput(fields, profilePicture);
    if (!input)
      return reply
        .code(400)
        .send({ message: request.t('auth_register_invalid_input') });
    try {
      const player = await this.registerPlayerUseCase.execute(input);
      const user = await this.loginUseCase.execute(
        player.email,
        input.password
      );
      if (!user) throw new Error('PLAYER_REGISTRATION_FAILED');
      return reply.code(201).send(await this.issueToken(reply, user));
    } catch (error) {
      if (error instanceof Error && error.message === 'COUNTRY_NOT_FOUND')
        return reply
          .code(400)
          .send({ message: request.t('country_not_found') });
      if (error instanceof Error && error.message === 'USERNAME_ALREADY_EXISTS')
        return reply
          .code(409)
          .send({ message: request.t('username_already_exists') });
      if (error instanceof Error && error.message === 'PLAYER_ROLE_NOT_FOUND')
        return reply
          .code(500)
          .send({ message: request.t('auth_register_unavailable') });
      if (error instanceof Error && error.message === 'INVALID_PROFILE_PICTURE')
        return reply
          .code(400)
          .send({ message: request.t('profile_picture_invalid') });
      if (postgresErrorCode(error) === '23505')
        return reply
          .code(409)
          .send({ message: request.t('user_already_exists') });
      throw error;
    }
  };

  public currentUser = async (request: FastifyRequest) => ({
    user: toPublicUser(request.authenticatedUser!),
  });

  public forgotPasswordSendCode = async (
    request: FastifyRequest<{ Body: ForgotPasswordSendCodeRequest }>,
    reply: FastifyReply
  ) => {
    try {
      await this.passwordResetService.sendCode(request.body.email.trim(), request.ip);
      return reply.code(202).send({ message: request.t('forgot_password_code_sent') });
    } catch (error) {
      if (error instanceof Error && error.message === 'RESET_RATE_LIMITED')
        return reply.code(429).send({ message: request.t('forgot_password_rate_limited') });
      request.log.error(error, 'Unable to deliver password reset code');
      return reply.code(503).send({ message: request.t('forgot_password_delivery_unavailable') });
    }
  };

  public forgotPasswordVerifyCode = async (
    request: FastifyRequest<{ Body: ForgotPasswordVerifyCodeRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const user = await this.passwordResetService.verifyCode(request.body.email.trim(), request.body.code);
      const resetToken = await reply.jwtSign(
        { user_id: user.id, module: 'manager', session_version: user.sessionVersion, token_purpose: 'password_reset' },
        { sign: { expiresIn: '15m' } }
      );
      return { reset_token: resetToken, expires_in: '15m' };
    } catch (error) {
      const key = error instanceof Error ? error.message : 'RESET_CODE_INVALID';
      const messageKey = key === 'RESET_CODE_EXPIRED' ? 'forgot_password_code_expired' : key === 'RESET_CODE_TOO_MANY_ATTEMPTS' ? 'forgot_password_too_many_attempts' : 'forgot_password_code_invalid';
      return reply.code(key === 'RESET_CODE_TOO_MANY_ATTEMPTS' ? 429 : 400).send({ message: request.t(messageKey) });
    }
  };

  public forgotPasswordResetPassword = async (
    request: FastifyRequest<{ Body: ForgotPasswordResetPasswordRequest }>,
    reply: FastifyReply
  ) => {
    const { new_password: password, confirm_password: confirmation } = request.body;
    if (password !== confirmation)
      return reply.code(400).send({ message: request.t('forgot_password_passwords_do_not_match') });
    await this.passwordResetService.resetPassword(request.authenticatedUser!.id, password);
    return reply.code(204).send();
  };

  public updateCurrentUser = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    let fields: Record<string, unknown>;
    let profilePicture: IProfilePicture | null;
    try {
      ({ fields, profilePicture } = await this.readProfileRequest(request));
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE')
        return reply
          .code(400)
          .send({ message: request.t('profile_picture_too_large') });
      throw error;
    }
    const input = parseOwnProfileInput(fields, profilePicture);
    if (!input)
      return reply
        .code(400)
        .send({ message: request.t('user_update_invalid_input') });
    try {
      const result = await this.updateOwnProfileUseCase.execute(
        request.authenticatedUser!,
        input
      );
      if (!result.user)
        return reply
          .code(401)
          .send({ message: request.t('auth_unauthorized_user') });
      return { user: result.user };
    } catch (error) {
      if (error instanceof Error && error.message === 'COUNTRY_NOT_FOUND')
        return reply
          .code(400)
          .send({ message: request.t('country_not_found') });
      if (error instanceof Error && error.message === 'USERNAME_ALREADY_EXISTS')
        return reply
          .code(409)
          .send({ message: request.t('username_already_exists') });
      if (error instanceof Error && error.message === 'INVALID_PROFILE_PICTURE')
        return reply
          .code(400)
          .send({ message: request.t('profile_picture_invalid') });
      if (postgresErrorCode(error) === '23505')
        return reply
          .code(409)
          .send({ message: request.t('user_already_exists') });
      throw error;
    }
  };
}
