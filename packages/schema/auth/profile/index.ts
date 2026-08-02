import type { LanguageCode } from '@core/common/types/user.js';
import type { IProfilePicture } from '@core/interfaces/user/IProfilePicture.js';
import type { IUpdateUserInput } from '@core/interfaces/user/IUpdateUserInput.js';
import { Type } from '@sinclair/typebox';
import {
  errorMessageSchema,
  publicUserSchema,
} from '@core/schema/common/user.schema.js';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const languages = new Set<LanguageCode>(['pt-BR', 'en', 'es']);
const readString = (fields: Record<string, unknown>, key: string) =>
  typeof fields[key] === 'string' ? fields[key].trim() : undefined;

export function parseOwnProfileInput(
  fields: Record<string, unknown>,
  profilePicture: IProfilePicture | null
): IUpdateUserInput | null {
  const input: IUpdateUserInput = {};
  const username = readString(fields, 'username');
  const email = readString(fields, 'email');
  const password =
    typeof fields.password === 'string' ? fields.password : undefined;
  const currentPassword =
    typeof fields.current_password === 'string'
      ? fields.current_password
      : undefined;
  const passwordConfirmation =
    typeof fields.confirm_password === 'string'
      ? fields.confirm_password
      : undefined;
  const countryId = readString(fields, 'country_id');
  const languageCode = readString(fields, 'language_code');
  const remove =
    fields.remove_profile_picture === true ||
    fields.remove_profile_picture === 'true';
  if (username !== undefined) {
    if (username.length < 3) return null;
    input.username = username;
  }
  if (email !== undefined) {
    if (!email) return null;
    input.email = email;
  }
  if (
    password !== undefined ||
    currentPassword !== undefined ||
    passwordConfirmation !== undefined
  ) {
    if (
      !password ||
      password.length < 8 ||
      !currentPassword ||
      passwordConfirmation === undefined
    )
      return null;
    input.password = password;
    input.currentPassword = currentPassword;
    input.passwordConfirmation = passwordConfirmation;
  }
  if (countryId !== undefined) {
    if (!uuidPattern.test(countryId)) return null;
    input.countryId = countryId;
  }
  if (languageCode !== undefined) {
    if (!languages.has(languageCode as LanguageCode)) return null;
    input.languageCode = languageCode as LanguageCode;
  }
  if (remove && profilePicture) return null;
  if (profilePicture) input.profilePicture = profilePicture;
  if (remove) input.removeProfilePicture = true;
  return Object.keys(input).length ? input : null;
}

export const updateOwnProfileSchema = {
  description:
    'Atualiza somente o perfil do usuário autenticado. Papel e status não podem ser alterados por esta rota. A troca de senha exige senha atual e confirmação.',
  tags: [ETagSwagger.auth],
  consumes: ['multipart/form-data', 'application/json'],
  security: [{ authenticateJwt: [] }],
  // O multipart é consumido pelo controller para preservar o stream da foto.
  // A validação dos campos ocorre em parseOwnProfileInput após essa leitura.
  body: Type.Any(),
  response: {
    200: Type.Object({ user: publicUserSchema }),
    400: errorMessageSchema,
    401: errorMessageSchema,
    409: errorMessageSchema,
  },
};
