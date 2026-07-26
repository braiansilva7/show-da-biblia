import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { DashboardController } from '@/controllers/dashboard/index.js';
import { dashboardViewPermissions } from '@/permissions/index.js';
import { dashboardSummarySchema } from '@core/schema/dashboard/summary/index.js';

export default function dashboardRoutes(server: FastifyInstance) {
  const controller = container.resolve(DashboardController);
  server.get('/dashboard/summary', {
    schema: dashboardSummarySchema,
    handler: controller.summary,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, dashboardViewPermissions),
    ],
  });
}
