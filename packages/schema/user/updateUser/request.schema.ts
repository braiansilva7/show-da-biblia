import { Type, type Static } from '@sinclair/typebox';
import { languageCodeSchema } from '@core/schema/common/user.schema.js';

export const updateUserRequestSchema = Type.Object(
  {
    username: Type.Optional(Type.String({ minLength: 3, maxLength: 120 })),
    email: Type.Optional(Type.String({ format: 'email', maxLength: 320 })),
    password: Type.Optional(Type.String({ minLength: 8, maxLength: 256 })),
    permission_role_id: Type.Optional(Type.String({ format: 'uuid' })),
    language_code: Type.Optional(languageCodeSchema),
    country_id: Type.Optional(Type.String({ format: 'uuid' })),
    active: Type.Optional(Type.Boolean()),
    remove_profile_picture: Type.Optional(Type.Boolean()),
  },
  { minProperties: 1 }
);

export type UpdateUserRequest = Static<typeof updateUserRequestSchema>;
