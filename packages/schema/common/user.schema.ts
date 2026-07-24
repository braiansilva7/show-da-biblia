import { Type } from '@sinclair/typebox';

export const languageCodeSchema = Type.Union([
  Type.Literal('pt-BR'),
  Type.Literal('en'),
  Type.Literal('es'),
]);

export const userRoleSchema = Type.Union([Type.Literal('ADMIN'), Type.Literal('PLAYER')]);

export const publicUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  role: userRoleSchema,
  country_id: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  language_code: languageCodeSchema,
  profile_picture_url: Type.Union([Type.String(), Type.Null()]),
  total_score: Type.Integer(),
  active: Type.Boolean(),
  created_at: Type.String(),
});

export const errorMessageSchema = Type.Object({
  message: Type.String(),
});
