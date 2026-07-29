import { Type } from '@sinclair/typebox';

export const languageCodeSchema = Type.Union([
  Type.Literal('pt-BR'),
  Type.Literal('en'),
  Type.Literal('es'),
]);

export const permissionActionSchema = Type.String();

export const publicUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  permission_role_id: Type.String({ format: 'uuid' }),
  permission_role: Type.Optional(
    Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      code: Type.Union([Type.String(), Type.Null()]),
      is_system: Type.Boolean(),
      active: Type.Boolean(),
    })
  ),
  permissions: Type.Array(permissionActionSchema),
  country_id: Type.String({ format: 'uuid' }),
  language_code: languageCodeSchema,
  profile_picture_url: Type.Union([Type.String(), Type.Null()]),
  total_score: Type.Integer(),
  best_time_seconds: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  highest_unlocked_level: Type.Union([
    Type.Literal(1),
    Type.Literal(2),
    Type.Literal(3),
  ]),
  active: Type.Boolean(),
  created_at: Type.String(),
});

export const errorMessageSchema = Type.Object({
  message: Type.String(),
});
