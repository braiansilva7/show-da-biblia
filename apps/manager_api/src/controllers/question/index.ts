import type { FastifyReply, FastifyRequest } from 'fastify';
import { inject, injectable } from 'tsyringe';
import type { DifficultyLevel } from '@core/common/types/difficulty.js';
import type { QuestionStatus } from '@core/common/types/question.js';
import { QuestionListerUseCase } from '@core/useCases/question/QuestionLister.usecase.js';
import { QuestionCreatorUseCase } from '@core/useCases/question/QuestionCreator.usecase.js';
import { QuestionViewerUseCase } from '@core/useCases/question/QuestionViewer.usecase.js';
import { QuestionUpdaterUseCase } from '@core/useCases/question/QuestionUpdater.usecase.js';
import { QuestionPublisherUseCase } from '@core/useCases/question/QuestionPublisher.usecase.js';
import { QuestionUnpublisherUseCase } from '@core/useCases/question/QuestionUnpublisher.usecase.js';
import { QuestionRemoverUseCase } from '@core/useCases/question/QuestionRemover.usecase.js';
import { QuestionPublishValidationError } from '@core/services/question.service.js';
import type {
  IQuestionMutationInput,
  QuestionLanguage,
} from '@core/interfaces/question/IQuestionMutationInput.js';

const languages: QuestionLanguage[] = ['pt-BR', 'en', 'es'];
const text = (value: unknown) =>
  typeof value === 'string' ? value.trim() || undefined : undefined;

function parseMutation(body: unknown): IQuestionMutationInput | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, any>;
  if (
    typeof value.category_id !== 'string' ||
    ![1, 2, 3].includes(value.difficulty_level) ||
    !Array.isArray(value.options)
  )
    return null;
  const rawTranslations = value.translations as
    Record<string, { statement?: unknown; explanation?: unknown }> | undefined;
  const translations = Object.fromEntries(
    languages.map((language) => [
      language,
      {
        statement: text(rawTranslations?.[language]?.statement),
        explanation: text(rawTranslations?.[language]?.explanation),
      },
    ])
  ) as IQuestionMutationInput['translations'];
  const options = value.options.map((option: Record<string, any>) => ({
    position: option.position,
    is_correct: option.is_correct,
    translations: Object.fromEntries(
      languages.map((language) => [
        language,
        {
          content: text(
            (
              option.translations as
                Record<string, { content?: unknown }> | undefined
            )?.[language]?.content
          ),
        },
      ])
    ) as IQuestionMutationInput['options'][number]['translations'],
  }));
  if (
    options.some(
      (option: any) =>
        typeof option.position !== 'number' ||
        typeof option.is_correct !== 'boolean'
    )
  )
    return null;
  return {
    categoryId: value.category_id,
    difficultyLevel: value.difficulty_level,
    translations,
    options,
  } as IQuestionMutationInput;
}

function toEditorQuestion(result: any) {
  const questionTranslations = new Map<string, any>(
    result.translations.map((translation: any): [string, any] => [
      translation.language_code,
      translation,
    ])
  );
  const optionTranslations = new Map<string, any>(
    result.optionTranslations.map((translation: any): [string, any] => [
      `${translation.answer_option_id}:${translation.language_code}`,
      translation,
    ])
  );
  return {
    id: result.question.id,
    category_id: result.question.category_id,
    difficulty_level: result.question.difficulty_level,
    status: result.question.status,
    created_by_user_id: result.question.created_by_user_id,
    created_at: result.question.created_at,
    updated_at: result.question.updated_at,
    published_at: result.question.published_at,
    translations: Object.fromEntries(
      languages.map((language) => {
        const translation = questionTranslations.get(language);
        return [
          language,
          translation
            ? {
                statement: translation.statement,
                explanation: translation.explanation,
              }
            : null,
        ];
      })
    ),
    options: result.options.map((option: any) => ({
      id: option.id,
      position: option.position,
      is_correct: option.is_correct,
      translations: Object.fromEntries(
        languages.map((language) => {
          const translation = optionTranslations.get(
            `${option.id}:${language}`
          );
          return [
            language,
            translation ? { content: translation.content } : null,
          ];
        })
      ),
    })),
  };
}

function requestLanguage(value: string | undefined): 'pt-BR' | 'en' | 'es' {
  const language = value?.toLowerCase() ?? '';
  if (language.startsWith('en')) return 'en';
  if (language.startsWith('es')) return 'es';
  return 'pt-BR';
}

@injectable()
export class QuestionController {
  constructor(
    @inject(QuestionListerUseCase)
    private readonly lister: QuestionListerUseCase,
    @inject(QuestionCreatorUseCase)
    private readonly creator: QuestionCreatorUseCase,
    @inject(QuestionViewerUseCase)
    private readonly viewer: QuestionViewerUseCase,
    @inject(QuestionUpdaterUseCase)
    private readonly updater: QuestionUpdaterUseCase,
    @inject(QuestionPublisherUseCase)
    private readonly publisher: QuestionPublisherUseCase,
    @inject(QuestionUnpublisherUseCase)
    private readonly unpublisher: QuestionUnpublisherUseCase,
    @inject(QuestionRemoverUseCase)
    private readonly remover: QuestionRemoverUseCase
  ) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      page?: number;
      limit?: number;
      search?: string;
      category_id?: string;
      difficulty_level?: DifficultyLevel;
      status?: QuestionStatus;
      author?: string;
      created_from?: string;
      created_to?: string;
    };
    if (
      query.created_from &&
      query.created_to &&
      new Date(query.created_from) > new Date(query.created_to)
    ) {
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_date_range') });
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      ...(await this.lister.execute({
        page,
        limit,
        language: requestLanguage(request.headers['accept-language']),
        search: query.search,
        categoryId: query.category_id,
        difficultyLevel: query.difficulty_level,
        status: query.status,
        author: query.author,
        createdFrom: query.created_from,
        createdTo: query.created_to,
      })),
      page,
      limit,
    };
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = parseMutation(request.body);
    if (!input)
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_input') });
    try {
      const question = await this.creator.execute(
        input,
        request.authenticatedUser!.id
      );
      return reply.code(201).send({ question: toEditorQuestion(question) });
    } catch (error) {
      return this.mutationError(error, request, reply);
    }
  };

  view = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id?: string }).id;
    if (!id)
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_input') });
    const question = await this.viewer.execute(id);
    if (!question)
      return reply.code(404).send({ message: request.t('question_not_found') });
    return { question: toEditorQuestion(question) };
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id?: string }).id;
    const input = parseMutation(request.body);
    if (!id || !input)
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_input') });
    try {
      const question = await this.updater.execute(id, input);
      if (!question)
        return reply
          .code(404)
          .send({ message: request.t('question_not_found') });
      return { question: toEditorQuestion(question) };
    } catch (error) {
      return this.mutationError(error, request, reply);
    }
  };

  publish = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id?: string }).id;
    if (!id)
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_input') });
    try {
      const question = await this.publisher.execute(id);
      if (!question)
        return reply
          .code(404)
          .send({ message: request.t('question_not_found') });
      return { question: toEditorQuestion(question) };
    } catch (error) {
      if (error instanceof QuestionPublishValidationError) {
        return reply.code(409).send({
          message: request.t('question_publish_incomplete'),
          pending: error.pending.map((item) =>
            request.t(`question_publish_pending_${item}`)
          ),
        });
      }
      return this.mutationError(error, request, reply);
    }
  };

  unpublish = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id?: string }).id;
    if (!id)
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_input') });
    try {
      const question = await this.unpublisher.execute(id);
      if (!question)
        return reply
          .code(404)
          .send({ message: request.t('question_not_found') });
      return { question: toEditorQuestion(question) };
    } catch (error) {
      return this.mutationError(error, request, reply);
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id?: string }).id;
    if (!id)
      return reply
        .code(400)
        .send({ message: request.t('question_invalid_input') });
    const result = await this.remover.execute(id);
    if (!result)
      return reply.code(404).send({ message: request.t('question_not_found') });
    return result;
  };

  private mutationError(
    error: unknown,
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (error instanceof Error) {
      const messages: Record<string, [number, string]> = {
        CATEGORY_NOT_FOUND: [400, 'question_category_not_found'],
        QUESTION_INVALID_OPTIONS: [400, 'question_invalid_options'],
        QUESTION_INVALID_TRANSLATION: [400, 'question_invalid_translation'],
        QUESTION_PUBLISHED_EDIT_FORBIDDEN: [
          409,
          'question_published_edit_forbidden',
        ],
        QUESTION_ALREADY_PUBLISHED: [409, 'question_already_published'],
        QUESTION_NOT_PUBLISHED: [409, 'question_not_published'],
      };
      const message = messages[error.message];
      if (message)
        return reply.code(message[0]).send({ message: request.t(message[1]) });
    }
    throw error;
  }
}
