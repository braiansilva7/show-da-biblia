import { Type, type Static } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

const difficultySchema = Type.Union([
  Type.Literal(1),
  Type.Literal(2),
  Type.Literal(3),
]);
const sessionStatusSchema = Type.Union([
  Type.Literal('IN_PROGRESS'),
  Type.Literal('FINISHED'),
  Type.Literal('ABANDONED'),
]);
const skipQuestionBodySchema = Type.Object({
  session_question_id: Type.String({ format: 'uuid' }),
});
const skipQuestionParamsSchema = Type.Object({
  sessionId: Type.String({ format: 'uuid' }),
});

export type SkipQuestionRequest = Static<typeof skipQuestionBodySchema>;

export const skipSessionQuestionSchema = {
  summary: 'Pular questão pendente da partida',
  description:
    'Marca a questão pendente como pulada e apresenta outra questão inédita da mesma dificuldade.',
  tags: [ETagSwagger.game],
  security: [{ authenticateJwt: [] }],
  params: skipQuestionParamsSchema,
  body: skipQuestionBodySchema,
  response: {
    200: Type.Object({
      session: Type.Object({
        id: Type.String({ format: 'uuid' }),
        current_level: difficultySchema,
        score: Type.Integer(),
        skips_remaining: Type.Integer({ minimum: 0, maximum: 3 }),
        status: sessionStatusSchema,
      }),
      question: Type.Object({
        session_question_id: Type.String({ format: 'uuid' }),
        order_number: Type.Integer({ minimum: 1 }),
        difficulty_level: difficultySchema,
        presented_at: Type.String({ format: 'date-time' }),
        statement: Type.String(),
        answers: Type.Array(
          Type.Object({
            id: Type.String({ format: 'uuid' }),
            position: Type.Integer({ minimum: 1, maximum: 4 }),
            content: Type.String(),
          }),
          { minItems: 4, maxItems: 4 }
        ),
      }),
    }),
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
  },
};
