import { Type, type Static } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';
const id = Type.String({ format: 'uuid' });
export const answerBody = Type.Object({
  session_question_id: id,
  answer_option_id: id,
});
export type AnswerBody = Static<typeof answerBody>;
const params = Type.Object({ sessionId: id });
const rankQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  page_size: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 100, default: 20 })
  ),
});
const error = {
  400: errorMessageSchema,
  401: errorMessageSchema,
  404: errorMessageSchema,
  409: errorMessageSchema,
};
const rankingItemSchema = Type.Object({
  position: Type.Integer({ minimum: 1 }),
  user_id: id,
  username: Type.String(),
  country_id: id,
  country_name: Type.String(),
  profile_picture_url: Type.Union([Type.String(), Type.Null()]),
  score: Type.Integer({ minimum: 0 }),
  correct_answers: Type.Integer({ minimum: 0 }),
  duration_seconds: Type.Integer({ minimum: 0 }),
});
const playerRankingSchema = Type.Object({
  position: Type.Integer({ minimum: 1 }),
  score: Type.Integer({ minimum: 0 }),
  correct_answers: Type.Integer({ minimum: 0 }),
  duration_seconds: Type.Integer({ minimum: 0 }),
});
const gameSummarySchema = Type.Object({
  id,
  status: Type.Literal('FINISHED'),
  end_reason: Type.Union([
    Type.Literal('TIMEOUT'),
    Type.Literal('WRONG_ANSWER'),
    Type.Literal('COMPLETED'),
  ]),
  score: Type.Integer(),
  correct_answers: Type.Integer(),
  answered_questions: Type.Integer(),
  skips_used: Type.Integer({ minimum: 0, maximum: 3 }),
  jokers: Type.Array(
    Type.Object({
      code: Type.String(),
      quantity_available: Type.Integer({ minimum: 0 }),
      quantity_used: Type.Integer({ minimum: 0 }),
    })
  ),
  highest_unlocked_level: Type.Union([
    Type.Literal(1),
    Type.Literal(2),
    Type.Literal(3),
  ]),
  duration_seconds: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
});
const answerFeedbackSchema = Type.Object({
  correct_answer_option_id: id,
  explanation: Type.String(),
});
export const startGameSchema = {
  tags: [ETagSwagger.game],
  summary: 'Iniciar partida',
  security: [{ authenticateJwt: [] }],
  response: {
    201: Type.Object({
      session: Type.Object({
        id,
        current_level: Type.Integer(),
        score: Type.Integer(),
        skips_remaining: Type.Integer(),
        status: Type.String(),
      }),
      question: Type.Any(),
      jokers: Type.Array(
        Type.Object({
          code: Type.Union([
            Type.Literal('ELIMINATE_1'),
            Type.Literal('ELIMINATE_2'),
            Type.Literal('ELIMINATE_3'),
            Type.Literal('REVEAL_ANSWER'),
          ]),
          quantity_available: Type.Integer({ minimum: 0 }),
          quantity_used: Type.Integer({ minimum: 0 }),
        })
      ),
    }),
    ...error,
  },
};
export const answerGameSchema = {
  tags: [ETagSwagger.game],
  summary: 'Responder questão',
  security: [{ authenticateJwt: [] }],
  params,
  body: answerBody,
  response: {
    200: Type.Union([
      Type.Object({
        finished: Type.Literal(true),
        summary: gameSummarySchema,
        feedback: answerFeedbackSchema,
      }),
      Type.Object({
        finished: Type.Literal(false),
        feedback: answerFeedbackSchema,
        session: Type.Any(),
        question: Type.Any(),
      }),
    ]),
    ...error,
  },
};
export const finishGameSchema = {
  tags: [ETagSwagger.game],
  summary: 'Finalizar partida',
  security: [{ authenticateJwt: [] }],
  params,
  response: {
    200: Type.Object({
      summary: gameSummarySchema,
      feedback: answerFeedbackSchema,
    }),
    ...error,
  },
};
export const abandonGameSchema = {
  tags: [ETagSwagger.game],
  summary: 'Abandonar partida em andamento',
  security: [{ authenticateJwt: [] }],
  params,
  response: { 204: Type.Null(), ...error },
};
export const rankingSchema = {
  tags: [ETagSwagger.game],
  summary: 'Consultar ranking',
  security: [{ authenticateJwt: [] }],
  querystring: rankQuery,
  response: {
    200: Type.Object({
      page: Type.Integer({ minimum: 1 }),
      page_size: Type.Integer({ minimum: 1, maximum: 100 }),
      total: Type.Integer({ minimum: 0 }),
      items: Type.Array(rankingItemSchema),
    }),
    ...error,
  },
};
export const myRankingSchema = {
  tags: [ETagSwagger.game],
  summary: 'Consultar a posição do jogador autenticado',
  security: [{ authenticateJwt: [] }],
  response: {
    200: Type.Object({
      international: Type.Union([playerRankingSchema, Type.Null()]),
      national: Type.Union([playerRankingSchema, Type.Null()]),
    }),
    ...error,
  },
};
