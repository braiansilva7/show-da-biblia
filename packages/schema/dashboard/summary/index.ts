import { Type } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

export const dashboardSummarySchema = {
  summary: 'Consultar resumo administrativo',
  description: 'Exige a permissão dashboard.view.',
  tags: [ETagSwagger.dashboard],
  security: [{ authenticateJwt: [] }],
  response: {
    200: Type.Object({
      summary: Type.Object({
        activeUsers: Type.Integer({ minimum: 0 }),
        publishedQuestions: Type.Integer({ minimum: 0 }),
        questionsByDifficulty: Type.Object({
          easy: Type.Integer({ minimum: 0 }),
          medium: Type.Integer({ minimum: 0 }),
          hard: Type.Integer({ minimum: 0 }),
        }),
        finishedGames: Type.Integer({ minimum: 0 }),
        totalScore: Type.Integer({ minimum: 0 }),
      }),
    }),
    401: errorMessageSchema,
    403: errorMessageSchema,
  },
};
