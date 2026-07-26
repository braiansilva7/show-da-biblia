import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { GameController } from '@/controllers/game/index.js';
import { authenticatedPermissions } from '@/permissions/index.js';
import { skipSessionQuestionSchema } from '@core/schema/game/skipQuestion/index.js';
import { useSessionJokerSchema } from '@core/schema/game/useJoker/index.js';
import {
  startGameSchema,
  answerGameSchema,
  finishGameSchema,
  rankingSchema,
} from '@core/schema/game/gameplay/index.js';

export default function gameSessionRoutes(server: FastifyInstance) {
  const controller = container.resolve(GameController);
  const auth = [
    (request: any, reply: any) =>
      server.authenticateJwt(request, reply, authenticatedPermissions),
  ];
  server.post('/game-sessions', {
    schema: startGameSchema,
    handler: controller.start,
    preHandler: auth,
  });
  server.post('/game-sessions/:sessionId/answers', {
    schema: answerGameSchema,
    handler: controller.answer,
    preHandler: auth,
  });
  server.post('/game-sessions/:sessionId/finish', {
    schema: finishGameSchema,
    handler: controller.finish,
    preHandler: auth,
  });
  server.get('/rankings/international', {
    schema: rankingSchema,
    handler: controller.internationalRanking,
    preHandler: auth,
  });
  server.get('/rankings/national', {
    schema: rankingSchema,
    handler: controller.nationalRanking,
    preHandler: auth,
  });
  server.get('/rankings/me', {
    schema: rankingSchema,
    handler: controller.myRanking,
    preHandler: auth,
  });

  server.post('/game-sessions/:sessionId/skip', {
    schema: skipSessionQuestionSchema,
    handler: controller.skipQuestion,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, authenticatedPermissions),
    ],
  });

  server.post('/game-sessions/:sessionId/jokers/use', {
    schema: useSessionJokerSchema,
    handler: controller.useJoker,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, authenticatedPermissions),
    ],
  });
}
