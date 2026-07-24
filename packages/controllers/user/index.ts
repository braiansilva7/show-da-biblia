import type { FastifyReply, FastifyRequest } from 'fastify';
import { injectable, inject } from 'tsyringe';
import { postgresErrorCode } from '@core/common/functions/postgres-error-code.js';
import {
  parseCreateUserInput,
  parseUpdateUserInput,
  parseUserId,
  parseUserMultipart,
} from '@core/schema/user/parseUserRequest.js';
import { UserCreatorUseCase } from '@core/useCases/user/UserCreator.usecase.js';
import { UserDeleterUseCase } from '@core/useCases/user/UserDeleter.usecase.js';
import { UserListerUseCase } from '@core/useCases/user/UserLister.usecase.js';
import { UserUpdaterUseCase } from '@core/useCases/user/UserUpdater.usecase.js';

@injectable()
export class UserController {
  constructor(
    @inject(UserListerUseCase) private readonly lister: UserListerUseCase,
    @inject(UserCreatorUseCase) private readonly creator: UserCreatorUseCase,
    @inject(UserUpdaterUseCase) private readonly updater: UserUpdaterUseCase,
    @inject(UserDeleterUseCase) private readonly deleter: UserDeleterUseCase
  ) {}

  public listUsers = async () => ({ users: await this.lister.execute() });

  public createUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const { fields, profilePicture } = await parseUserMultipart(request);
    const input = parseCreateUserInput(fields, profilePicture);
    if (!input) {
      return reply.code(400).send({
        message: 'Informe nome de usuário, e-mail válido, senha de ao menos 8 caracteres, perfil e idioma.',
      });
    }

    try {
      return reply.code(201).send({ user: await this.creator.execute(input) });
    } catch (error) {
      if (postgresErrorCode(error) === '23505') {
        return reply.code(409).send({ message: 'Já existe um usuário com este nome ou e-mail.' });
      }
      throw error;
    }
  };

  public updateUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = parseUserId(request.params);
    const { fields, profilePicture } = await parseUserMultipart(request);
    const input = parseUpdateUserInput(fields, profilePicture);
    if (!id || !input) {
      return reply.code(400).send({ message: 'Informe ao menos um campo válido para edição.' });
    }

    try {
      const result = await this.updater.execute(id, input, request.authenticatedUser!);
      if ('error' in result) {
        return reply.code(400).send({
          message: 'Você não pode desativar nem remover o perfil administrador da própria conta.',
        });
      }
      if (!result.user) return reply.code(404).send({ message: 'Usuário não encontrado.' });
      return { user: result.user };
    } catch (error) {
      if (postgresErrorCode(error) === '23505') {
        return reply.code(409).send({ message: 'Já existe um usuário com este nome ou e-mail.' });
      }
      throw error;
    }
  };

  public deleteUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = parseUserId(request.params);
    if (!id) return reply.code(400).send({ message: 'Identificador de usuário inválido.' });

    try {
      const result = await this.deleter.execute(id, request.authenticatedUser!);
      if ('error' in result) {
        return reply.code(400).send({ message: 'Você não pode excluir a própria conta.' });
      }
      if (!result.deleted) return reply.code(404).send({ message: 'Usuário não encontrado.' });
      return reply.code(204).send();
    } catch (error) {
      if (postgresErrorCode(error) === '23503') {
        return reply.code(409).send({
          message: 'Este usuário possui dados vinculados e não pode ser excluído. Desative-o em vez disso.',
        });
      }
      throw error;
    }
  };
}
