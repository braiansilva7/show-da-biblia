import { Type } from '@sinclair/typebox';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

export const deleteUserSchema = {
  description: 'Remove um usuário',
  tags: ['users'],
  security: [{ authenticateJwt: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  response: {
    204: Type.Null(),
    400: errorMessageSchema,
    401: errorMessageSchema,
    403: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
  },
};
