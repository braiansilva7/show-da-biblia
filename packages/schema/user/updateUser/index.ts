import { Type } from '@sinclair/typebox';
import { updateUserRequestSchema } from './request.schema.js';
import { updateUserResponseSchema } from './response.schema.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';

export const updateUserSchema = {
  description:
    'Atualiza um usuário. Aceita JSON ou multipart/form-data com os campos username, email, password, permission_role_id, language_code (pt-BR, en ou es), country_id, active, remove_profile_picture e o arquivo profile_picture. A foto aceita JPEG, PNG, WEBP ou GIF de até 5 MB; remove_profile_picture não pode ser enviado junto com profile_picture.',
  tags: [ETagSwagger.user],
  consumes: ['multipart/form-data', 'application/json'],
  security: [{ authenticateJwt: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  // Body validado manualmente para aceitar JSON e multipart (com foto).
  response: {
    200: updateUserResponseSchema,
    400: errorMessageSchema,
    401: errorMessageSchema,
    403: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
  },
};

export { updateUserRequestSchema, updateUserResponseSchema };
