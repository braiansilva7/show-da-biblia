import { Type } from '@sinclair/typebox';
import type { LanguageCode } from '@core/common/types/user.js';
import type { IRegisterPlayerInput } from '@core/interfaces/auth/IRegisterPlayerInput.js';
import type { IProfilePicture } from '@core/interfaces/user/IProfilePicture.js';
import { errorMessageSchema } from '@core/schema/common/user.schema.js';
import { loginResponseSchema } from '@core/schema/auth/login/response.schema.js';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const languages = new Set<LanguageCode>(['pt-BR', 'en', 'es']);

function readString(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

export function parseRegisterPlayerInput(
  fields: Record<string, unknown>,
  profilePicture: IProfilePicture | null
): IRegisterPlayerInput | null {
  const username = readString(fields, 'username');
  const email = readString(fields, 'email');
  const password =
    typeof fields.password === 'string' ? fields.password : undefined;
  const countryId = readString(fields, 'country_id');
  const languageCode = readString(fields, 'language_code');
  if (
    !username ||
    username.length < 3 ||
    !email ||
    !password ||
    password.length < 8 ||
    !countryId ||
    !uuidPattern.test(countryId) ||
    !languageCode ||
    !languages.has(languageCode as LanguageCode)
  )
    return null;
  return {
    username,
    email,
    password,
    countryId,
    languageCode: languageCode as LanguageCode,
    profilePicture,
  };
}

export const registerPlayerSchema = {
  description:
    'Cria uma conta pública de jogador. O papel PLAYER é atribuído exclusivamente pelo servidor.',
  tags: [ETagSwagger.auth],
  consumes: ['multipart/form-data', 'application/json'],
  // O multipart é consumido pelo controller para preservar o stream da foto.
  // A validação dos campos ocorre em parseRegisterPlayerInput, depois da leitura
  // das partes; validar aqui faria o Fastify rejeitar o stream antes do handler.
  body: Type.Any(),
  response: {
    201: loginResponseSchema,
    400: errorMessageSchema,
    409: errorMessageSchema,
    500: errorMessageSchema,
  },
};
