import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { CategoryController } from '@/controllers/category/index.js';
import {
  categoryCreatePermissions,
  categoryDeletePermissions,
  categoryUpdatePermissions,
  categoryViewPermissions,
} from '@/permissions/index.js';
import {
  createCategorySchema,
  deleteCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from '@core/schema/category/index.js';

export default function categoryRoutes(server: FastifyInstance) {
  const controller = container.resolve(CategoryController);
  server.get('/categories', {
    schema: listCategoriesSchema,
    handler: controller.list,
    preHandler: [
      (q, r) => server.authenticateJwt(q, r, categoryViewPermissions),
    ],
  });
  server.post('/categories', {
    schema: createCategorySchema,
    handler: controller.create,
    preHandler: [
      (q, r) => server.authenticateJwt(q, r, categoryCreatePermissions),
    ],
  });
  server.patch('/categories/:id', {
    schema: updateCategorySchema,
    handler: controller.update,
    preHandler: [
      (q, r) => server.authenticateJwt(q, r, categoryUpdatePermissions),
    ],
  });
  server.delete('/categories/:id', {
    schema: deleteCategorySchema,
    handler: controller.remove,
    preHandler: [
      (q, r) => server.authenticateJwt(q, r, categoryDeletePermissions),
    ],
  });
}
