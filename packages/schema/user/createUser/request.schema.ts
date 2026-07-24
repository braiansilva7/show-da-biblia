import { Type, type Static } from '@sinclair/typebox';
import { languageCodeSchema, userRoleSchema } from '@core/schema/common/user.schema.js';

export const createUserRequestSchema = Type.Object({
  username: Type.String({ minLength: 3, maxLength: 120 }),
  email: Type.String({ format: 'email', maxLength: 320 }),
  password: Type.String({ minLength: 8, maxLength: 256 }),
  role: userRoleSchema,
  language_code: languageCodeSchema,
  country_id: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  active: Type.Optional(Type.Boolean()),
});

export type CreateUserRequest = Static<typeof createUserRequestSchema>;
