import { Type, type Static } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

export const categorySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  active: Type.Boolean(),
});

export type CategoryResponse = Static<typeof categorySchema>;

const categoryIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
const authenticatedErrors = {
  401: errorMessageSchema,
  403: errorMessageSchema,
};
const categoryResponseSchema = Type.Object({ category: categorySchema });

export const listCategoriesSchema = {
  summary: 'Listar categorias',
  description: 'Lista categorias com paginação e filtro por nome.',
  tags: [ETagSwagger.category],
  security: [{ authenticateJwt: [] }],
  querystring: Type.Object({
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 })
    ),
    search: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  }),
  response: {
    200: Type.Object({
      categories: Type.Array(categorySchema),
      total: Type.Integer({ minimum: 0 }),
      page: Type.Integer({ minimum: 1 }),
      limit: Type.Integer({ minimum: 1 }),
    }),
    ...authenticatedErrors,
  },
};

export const createCategorySchema = {
  summary: 'Criar categoria',
  description: 'Cria uma categoria de questões.',
  tags: [ETagSwagger.category],
  security: [{ authenticateJwt: [] }],
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.Optional(
      Type.Union([Type.String({ maxLength: 1000 }), Type.Null()])
    ),
    active: Type.Optional(Type.Boolean()),
  }),
  response: {
    201: categoryResponseSchema,
    400: errorMessageSchema,
    409: errorMessageSchema,
    ...authenticatedErrors,
  },
};

export const updateCategorySchema = {
  summary: 'Editar categoria',
  description: 'Edita uma categoria que não possui questões vinculadas.',
  tags: [ETagSwagger.category],
  security: [{ authenticateJwt: [] }],
  params: categoryIdParamsSchema,
  body: Type.Object(
    {
      name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
      description: Type.Optional(
        Type.Union([Type.String({ maxLength: 1000 }), Type.Null()])
      ),
      active: Type.Optional(Type.Boolean()),
    },
    { minProperties: 1 }
  ),
  response: {
    200: categoryResponseSchema,
    400: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
    ...authenticatedErrors,
  },
};

export const deleteCategorySchema = {
  summary: 'Excluir categoria',
  description: 'Exclui uma categoria que não possui questões vinculadas.',
  tags: [ETagSwagger.category],
  security: [{ authenticateJwt: [] }],
  params: categoryIdParamsSchema,
  response: {
    204: Type.Null(),
    404: errorMessageSchema,
    409: errorMessageSchema,
    ...authenticatedErrors,
  },
};
