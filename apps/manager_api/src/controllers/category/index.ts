import type { FastifyReply, FastifyRequest } from 'fastify';
import { inject, injectable } from 'tsyringe';
import { postgresErrorCode } from '@core/common/functions/postgres-error-code.js';
import { CategoryCreatorUseCase } from '@core/useCases/category/CategoryCreator.usecase.js';
import { CategoryDeleterUseCase } from '@core/useCases/category/CategoryDeleter.usecase.js';
import { CategoryListerUseCase } from '@core/useCases/category/CategoryLister.usecase.js';
import { CategoryUpdaterUseCase } from '@core/useCases/category/CategoryUpdater.usecase.js';

type CategoryBody = {
  name?: string;
  description?: string | null;
  active?: boolean;
};

function normalizeInput(body: CategoryBody) {
  const input: CategoryBody = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return null;
    input.name = name;
  }
  if (body.description !== undefined)
    input.description =
      body.description === null ? null : body.description.trim() || null;
  if (body.active !== undefined) input.active = body.active;
  return input;
}

@injectable()
export class CategoryController {
  constructor(
    @inject(CategoryListerUseCase)
    private readonly lister: CategoryListerUseCase,
    @inject(CategoryCreatorUseCase)
    private readonly creator: CategoryCreatorUseCase,
    @inject(CategoryUpdaterUseCase)
    private readonly updater: CategoryUpdaterUseCase,
    @inject(CategoryDeleterUseCase)
    private readonly deleter: CategoryDeleterUseCase
  ) {}

  list = async (request: FastifyRequest) => {
    const query = request.query as {
      page?: number;
      limit?: number;
      search?: string;
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      ...(await this.lister.execute({ page, limit, search: query.search })),
      page,
      limit,
    };
  };

  create = async (
    request: FastifyRequest<{ Body: CategoryBody }>,
    reply: FastifyReply
  ) => {
    const input = normalizeInput(request.body);
    if (!input || input.name === undefined)
      return reply
        .code(400)
        .send({ message: request.t('category_create_invalid_input') });
    try {
      return reply.code(201).send({
        category: await this.creator.execute({ ...input, name: input.name }),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'CATEGORY_NAME_ALREADY_EXISTS'
      )
        return reply
          .code(409)
          .send({ message: request.t('category_name_already_exists') });
      if (postgresErrorCode(error) === '23505')
        return reply
          .code(409)
          .send({ message: request.t('category_name_already_exists') });
      throw error;
    }
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string }; Body: CategoryBody }>,
    reply: FastifyReply
  ) => {
    const input = normalizeInput(request.body);
    if (!input || !Object.keys(input).length)
      return reply
        .code(400)
        .send({ message: request.t('category_update_invalid_input') });
    try {
      const category = await this.updater.execute(request.params.id, input);
      return category
        ? { category }
        : reply.code(404).send({ message: request.t('category_not_found') });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'CATEGORY_NAME_ALREADY_EXISTS'
      )
        return reply
          .code(409)
          .send({ message: request.t('category_name_already_exists') });
      if (error instanceof Error && error.message === 'CATEGORY_HAS_QUESTIONS')
        return reply
          .code(409)
          .send({ message: request.t('category_has_questions') });
      if (postgresErrorCode(error) === '23505')
        return reply
          .code(409)
          .send({ message: request.t('category_name_already_exists') });
      throw error;
    }
  };

  remove = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const deleted = await this.deleter.execute(request.params.id);
      return deleted
        ? reply.code(204).send()
        : reply.code(404).send({ message: request.t('category_not_found') });
    } catch (error) {
      if (error instanceof Error && error.message === 'CATEGORY_HAS_QUESTIONS')
        return reply
          .code(409)
          .send({ message: request.t('category_has_questions') });
      if (postgresErrorCode(error) === '23503')
        return reply
          .code(409)
          .send({ message: request.t('category_has_questions') });
      throw error;
    }
  };
}
