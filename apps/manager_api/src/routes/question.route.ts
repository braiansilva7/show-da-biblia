import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { QuestionController } from '@/controllers/question/index.js';
import { questionCreatePermissions, questionDeletePermissions, questionPublishPermissions, questionUpdatePermissions, questionViewPermissions } from '@/permissions/index.js';
import { createQuestionSchema, deleteQuestionSchema, listQuestionsSchema, publishQuestionSchema, unpublishQuestionSchema, updateQuestionSchema, viewQuestionSchema } from '@core/schema/question/index.js';

export default function questionRoutes(server: FastifyInstance) {
  const controller = container.resolve(QuestionController);
  server.get('/questions', {
    schema: listQuestionsSchema,
    handler: controller.list,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, questionViewPermissions),
    ],
  });
  server.post('/questions', {
    schema: createQuestionSchema, handler: controller.create,
    preHandler: [(request, reply) => server.authenticateJwt(request, reply, questionCreatePermissions)],
  });
  server.get('/questions/:id', {
    schema: viewQuestionSchema, handler: controller.view,
    preHandler: [(request, reply) => server.authenticateJwt(request, reply, questionViewPermissions)],
  });
  server.patch('/questions/:id', {
    schema: updateQuestionSchema, handler: controller.update,
    preHandler: [(request, reply) => server.authenticateJwt(request, reply, questionUpdatePermissions)],
  });
  server.post('/questions/:id/publish', {
    schema: publishQuestionSchema, handler: controller.publish,
    preHandler: [(request, reply) => server.authenticateJwt(request, reply, questionPublishPermissions)],
  });
  server.post('/questions/:id/unpublish', {
    schema: unpublishQuestionSchema, handler: controller.unpublish,
    preHandler: [(request, reply) => server.authenticateJwt(request, reply, questionPublishPermissions)],
  });
  server.delete('/questions/:id', {
    schema: deleteQuestionSchema, handler: controller.remove,
    preHandler: [(request, reply) => server.authenticateJwt(request, reply, questionDeletePermissions)],
  });
}
