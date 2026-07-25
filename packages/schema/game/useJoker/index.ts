import { Type, type Static } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

const jokerTypeCodeSchema = Type.Union([
  Type.Literal('ELIMINATE_1'),
  Type.Literal('ELIMINATE_2'),
  Type.Literal('ELIMINATE_3'),
  Type.Literal('REVEAL_ANSWER'),
]);

const useJokerBodySchema = Type.Object({
  session_question_id: Type.String({ format: 'uuid' }),
  joker_type_code: jokerTypeCodeSchema,
});
const useJokerParamsSchema = Type.Object({
  sessionId: Type.String({ format: 'uuid' }),
});

export type UseJokerRequest = Static<typeof useJokerBodySchema>;

export const useSessionJokerSchema = {
  summary: 'Usar carta coringa na questão pendente',
  description:
    'Aplica uma carta disponível à questão pendente da própria partida sem expor o gabarito.',
  tags: [ETagSwagger.game],
  security: [{ authenticateJwt: [] }],
  params: useJokerParamsSchema,
  body: useJokerBodySchema,
  response: {
    200: Type.Object({
      session_joker: Type.Object({
        joker_type_code: jokerTypeCodeSchema,
        quantity_available: Type.Integer({ minimum: 0 }),
        quantity_used: Type.Integer({ minimum: 1 }),
      }),
      effect: Type.Object({
        eliminated_answer_option_ids: Type.Array(
          Type.String({ format: 'uuid' })
        ),
        revealed_answer_option_id: Type.Optional(
          Type.String({ format: 'uuid' })
        ),
      }),
    }),
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
  },
};
