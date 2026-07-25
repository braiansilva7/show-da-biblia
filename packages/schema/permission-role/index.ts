import { Type } from '@sinclair/typebox';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';
import { permissionActions } from '@core/common/types/permission.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';

const permissionActionSchema = Type.String({ enum: [...permissionActions] });
const roleIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
const permissionRoleSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  code: Type.Union([Type.String(), Type.Null()]),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  isSystem: Type.Boolean(),
  active: Type.Boolean(),
  permissions: Type.Array(permissionActionSchema),
});
const roleResponseSchema = Type.Object({ role: permissionRoleSchema });
const authenticatedErrors = {
  401: errorMessageSchema,
  403: errorMessageSchema,
};

export const listPermissionRolesSchema = {
  summary: 'Listar papéis e ações',
  description:
    'Lista os papéis de permissões e o catálogo de ações disponível.',
  tags: [ETagSwagger.role],
  security: [{ authenticateJwt: [] }],
  response: {
    200: Type.Object({
      roles: Type.Array(permissionRoleSchema),
      permissions: Type.Array(permissionActionSchema),
    }),
    ...authenticatedErrors,
  },
};

export const viewPermissionRoleSchema = {
  summary: 'Consultar papel',
  description: 'Consulta um papel de permissões pelo identificador.',
  tags: [ETagSwagger.role],
  security: [{ authenticateJwt: [] }],
  params: roleIdParamsSchema,
  response: {
    200: roleResponseSchema,
    404: errorMessageSchema,
    ...authenticatedErrors,
  },
};

export const createPermissionRoleSchema = {
  summary: 'Criar papel personalizado',
  description: 'Cria um papel personalizado com as ações selecionadas.',
  tags: [ETagSwagger.role],
  security: [{ authenticateJwt: [] }],
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    permissions: Type.Array(permissionActionSchema),
  }),
  response: {
    201: roleResponseSchema,
    400: errorMessageSchema,
    ...authenticatedErrors,
  },
};

export const updatePermissionRoleSchema = {
  summary: 'Editar papel personalizado',
  description: 'Edita nome, descrição ou situação de um papel personalizado.',
  tags: [ETagSwagger.role],
  security: [{ authenticateJwt: [] }],
  params: roleIdParamsSchema,
  body: Type.Object(
    {
      name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
      description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      active: Type.Optional(Type.Boolean()),
    },
    { minProperties: 1 }
  ),
  response: {
    200: roleResponseSchema,
    400: errorMessageSchema,
    404: errorMessageSchema,
    ...authenticatedErrors,
  },
};

export const setPermissionRoleActionsSchema = {
  summary: 'Atualizar ações de um papel',
  description: 'Substitui a matriz de ações de um papel personalizado.',
  tags: [ETagSwagger.role],
  security: [{ authenticateJwt: [] }],
  params: roleIdParamsSchema,
  body: Type.Object({ permissions: Type.Array(permissionActionSchema) }),
  response: {
    200: roleResponseSchema,
    400: errorMessageSchema,
    404: errorMessageSchema,
    ...authenticatedErrors,
  },
};

export const deletePermissionRoleSchema = {
  summary: 'Excluir papel personalizado',
  description:
    'Exclui um papel personalizado sem usuários vinculados. Papéis de sistema são protegidos.',
  tags: [ETagSwagger.role],
  security: [{ authenticateJwt: [] }],
  params: roleIdParamsSchema,
  response: {
    204: Type.Null(),
    400: errorMessageSchema,
    404: errorMessageSchema,
    ...authenticatedErrors,
  },
};
