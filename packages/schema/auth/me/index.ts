import { Type, type Static } from '@sinclair/typebox';
import { publicUserSchema, errorMessageSchema } from '@core/schema/common/user.schema.js';

export const meResponseSchema = Type.Object({
  user: publicUserSchema,
});

export type MeResponse = Static<typeof meResponseSchema>;

export const currentUserSchema = {
  description: 'Retorna o usuário autenticado',
  tags: ['auth'],
  security: [{ authenticateJwt: [] }],
  response: {
    200: meResponseSchema,
    401: errorMessageSchema,
  },
};
