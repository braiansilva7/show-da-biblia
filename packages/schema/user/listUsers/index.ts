import { Type, type Static } from '@sinclair/typebox';
import {
  publicUserSchema,
  errorMessageSchema,
} from '@core/schema/common/user.schema.js';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';

export const listUsersResponseSchema = Type.Object({
  users: Type.Array(publicUserSchema),
  total: Type.Integer({ minimum: 0 }),
  page: Type.Integer({ minimum: 1 }),
  limit: Type.Integer({ minimum: 1 }),
});

export type ListUsersResponse = Static<typeof listUsersResponseSchema>;

export const listUsersSchema = {
  description: 'Lista usuários',
  tags: [ETagSwagger.user],
  summary: 'Lista usuários com paginação e filtro por usuário ou e-mail',
  security: [{ authenticateJwt: [] }],
  querystring: Type.Object({
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
    search: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  }),
  response: {
    200: listUsersResponseSchema,
    401: errorMessageSchema,
    403: errorMessageSchema,
  },
};
