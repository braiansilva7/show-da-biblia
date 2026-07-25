import { Type } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

const questionStatusSchema = Type.Union([
  Type.Literal('DRAFT'),
  Type.Literal('PUBLISHED'),
  Type.Literal('ARCHIVED'),
]);
const difficultySchema = Type.Union([
  Type.Literal(1),
  Type.Literal(2),
  Type.Literal(3),
]);
const questionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  statement_preview: Type.Union([Type.String(), Type.Null()]),
  statement_language: Type.Union([Type.String(), Type.Null()]),
  category: Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String(),
  }),
  difficulty_level: difficultySchema,
  status: questionStatusSchema,
  languages: Type.Array(Type.String()),
  author: Type.Object({
    id: Type.String({ format: 'uuid' }),
    username: Type.String(),
    email: Type.String({ format: 'email' }),
  }),
  created_at: Type.String(),
  updated_at: Type.String(),
  published_at: Type.Union([Type.String(), Type.Null()]),
  answer_options_count: Type.Integer({ minimum: 0 }),
  correct_answers_count: Type.Integer({ minimum: 0 }),
  is_complete: Type.Boolean(),
});

const languageCodes = ['pt-BR', 'en', 'es'] as const;
const questionTranslationSchema = Type.Object({
  statement: Type.Optional(Type.String({ maxLength: 10000 })),
  explanation: Type.Optional(Type.String({ maxLength: 20000 })),
});
const answerTranslationSchema = Type.Object({
  content: Type.Optional(Type.String({ maxLength: 10000 })),
});
const mutationTranslationsSchema = Type.Object({
  'pt-BR': Type.Optional(questionTranslationSchema),
  en: Type.Optional(questionTranslationSchema),
  es: Type.Optional(questionTranslationSchema),
});
const optionTranslationsSchema = Type.Object({
  'pt-BR': Type.Optional(answerTranslationSchema),
  en: Type.Optional(answerTranslationSchema),
  es: Type.Optional(answerTranslationSchema),
});
const mutationOptionSchema = Type.Object({
  position: Type.Integer({ minimum: 1, maximum: 5 }),
  is_correct: Type.Boolean(),
  translations: optionTranslationsSchema,
});
const questionMutationBodySchema = Type.Object({
  category_id: Type.String({ format: 'uuid' }),
  difficulty_level: difficultySchema,
  translations: mutationTranslationsSchema,
  options: Type.Array(mutationOptionSchema, { minItems: 5, maxItems: 5 }),
});
const questionEditorSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  category_id: Type.String({ format: 'uuid' }),
  difficulty_level: difficultySchema,
  status: questionStatusSchema,
  created_by_user_id: Type.String({ format: 'uuid' }),
  created_at: Type.String(),
  updated_at: Type.String(),
  published_at: Type.Union([Type.String(), Type.Null()]),
  translations: Type.Object({
    'pt-BR': Type.Union([Type.Object({ statement: Type.String(), explanation: Type.String() }), Type.Null()]),
    en: Type.Union([Type.Object({ statement: Type.String(), explanation: Type.String() }), Type.Null()]),
    es: Type.Union([Type.Object({ statement: Type.String(), explanation: Type.String() }), Type.Null()]),
  }),
  options: Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    position: Type.Integer({ minimum: 1, maximum: 5 }),
    is_correct: Type.Boolean(),
    translations: Type.Object({
      'pt-BR': Type.Union([Type.Object({ content: Type.String() }), Type.Null()]),
      en: Type.Union([Type.Object({ content: Type.String() }), Type.Null()]),
      es: Type.Union([Type.Object({ content: Type.String() }), Type.Null()]),
    }),
  }), { minItems: 5, maxItems: 5 }),
});
const questionEditorResponseSchema = Type.Object({ question: questionEditorSchema });
const questionIdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const publicationPendingSchema = Type.Array(Type.String());

export const listQuestionsSchema = {
  summary: 'Listar questões administrativas',
  description:
    'Lista questões com filtros administrativos e resumo de completude, sem expor explicações nem alternativas.',
  tags: [ETagSwagger.question],
  security: [{ authenticateJwt: [] }],
  querystring: Type.Object({
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 })
    ),
    search: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
    category_id: Type.Optional(Type.String({ format: 'uuid' })),
    difficulty_level: Type.Optional(difficultySchema),
    status: Type.Optional(questionStatusSchema),
    author: Type.Optional(Type.String({ minLength: 1, maxLength: 320 })),
    created_from: Type.Optional(Type.String({ format: 'date-time' })),
    created_to: Type.Optional(Type.String({ format: 'date-time' })),
  }),
  response: {
    200: Type.Object({
      questions: Type.Array(questionSchema),
      total: Type.Integer({ minimum: 0 }),
      page: Type.Integer({ minimum: 1 }),
      limit: Type.Integer({ minimum: 1 }),
      categories: Type.Array(
        Type.Object({
          id: Type.String({ format: 'uuid' }),
          name: Type.String(),
        })
      ),
    }),
    400: errorMessageSchema,
    401: errorMessageSchema,
    403: errorMessageSchema,
  },
};

const editorErrors = { 400: errorMessageSchema, 401: errorMessageSchema, 403: errorMessageSchema, 404: errorMessageSchema, 409: errorMessageSchema };
export const createQuestionSchema = {
  summary: 'Criar questão em rascunho', tags: [ETagSwagger.question], security: [{ authenticateJwt: [] }],
  body: questionMutationBodySchema,
  response: { 201: questionEditorResponseSchema, ...editorErrors },
};
export const viewQuestionSchema = {
  summary: 'Consultar questão para edição', tags: [ETagSwagger.question], security: [{ authenticateJwt: [] }],
  params: questionIdParamsSchema,
  response: { 200: questionEditorResponseSchema, ...editorErrors },
};
export const updateQuestionSchema = {
  summary: 'Editar questão em rascunho ou arquivada', tags: [ETagSwagger.question], security: [{ authenticateJwt: [] }],
  params: questionIdParamsSchema, body: questionMutationBodySchema,
  response: { 200: questionEditorResponseSchema, ...editorErrors },
};
export const publishQuestionSchema = {
  summary: 'Validar e publicar questão',
  description: 'Publica uma questão completa em rascunho ou arquivada.',
  tags: [ETagSwagger.question], security: [{ authenticateJwt: [] }], params: questionIdParamsSchema,
  response: {
    200: questionEditorResponseSchema,
    ...editorErrors,
    409: Type.Object({ message: Type.String(), pending: publicationPendingSchema }),
  },
};
export const deleteQuestionSchema = {
  summary: 'Excluir ou arquivar questão',
  description: 'Exclui uma questão sem histórico ou a arquiva quando há partidas vinculadas.',
  tags: [ETagSwagger.question], security: [{ authenticateJwt: [] }], params: questionIdParamsSchema,
  response: { 200: Type.Object({ action: Type.Union([Type.Literal('deleted'), Type.Literal('archived')]) }), ...editorErrors },
};
