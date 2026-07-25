import { Type } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

export const countrySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  iso_code: Type.String({ minLength: 2, maxLength: 2 }),
  name: Type.String(),
});

export const listCountriesSchema = {
  summary: 'Listar países ativos',
  description: 'Lista os países ativos disponíveis no cadastro de usuários',
  tags: [ETagSwagger.country],
  security: [{ authenticateJwt: [] }],
  response: {
    200: Type.Object({ countries: Type.Array(countrySchema) }),
    401: errorMessageSchema,
    403: errorMessageSchema,
  },
};
