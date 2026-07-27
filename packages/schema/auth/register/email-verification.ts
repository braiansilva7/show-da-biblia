import { Type } from '@sinclair/typebox';
import { languageCodeSchema, errorMessageSchema } from '@core/schema/common/user.schema.js';

const email = Type.String({ format: 'email', maxLength: 320 });
const code = Type.String({ pattern: '^[0-9]{6}$' });

export const requestRegistrationEmailCodeSchema = {
  tags: ['Auth'], summary: 'Envia um código para confirmar o e-mail de cadastro',
  body: Type.Object({ email, language_code: languageCodeSchema }),
  response: { 202: Type.Object({ message: Type.String() }), 400: errorMessageSchema, 409: errorMessageSchema, 429: errorMessageSchema, 503: errorMessageSchema },
};
export const verifyRegistrationEmailCodeSchema = {
  tags: ['Auth'], summary: 'Valida o código de confirmação de e-mail de cadastro',
  body: Type.Object({ email, code }),
  response: { 200: Type.Object({ registration_token: Type.String(), expires_in: Type.String() }), 400: errorMessageSchema, 409: errorMessageSchema, 429: errorMessageSchema },
};
export type RequestRegistrationEmailCodeRequest = { email: string; language_code: 'pt-BR' | 'en' | 'es' };
export type VerifyRegistrationEmailCodeRequest = { email: string; code: string };
