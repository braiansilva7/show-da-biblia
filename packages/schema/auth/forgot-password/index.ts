import { Type } from '@sinclair/typebox';

const email = Type.String({ format: 'email', maxLength: 320 });
const code = Type.String({ pattern: '^[0-9]{6}$' });
const message = Type.Object({ message: Type.String() });

export const forgotPasswordSendCodeSchema = {
  tags: ['Auth'],
  summary: 'Envia um código de recuperação de senha',
  body: Type.Object({ email }),
  response: { 202: message, 429: message, 503: message },
};

export const forgotPasswordVerifyCodeSchema = {
  tags: ['Auth'],
  summary: 'Valida um código de recuperação de senha',
  body: Type.Object({ email, code }),
  response: {
    200: Type.Object({ reset_token: Type.String(), expires_in: Type.String() }),
    400: message,
    429: message,
  },
};

export const forgotPasswordResetPasswordSchema = {
  tags: ['Auth'],
  summary: 'Redefine a senha após validar o código',
  security: [{ authenticateJwt: [] }],
  body: Type.Object({
    new_password: Type.String({ minLength: 8, maxLength: 256 }),
    confirm_password: Type.String({ minLength: 8, maxLength: 256 }),
  }),
  response: { 204: Type.Null(), 400: message, 401: message },
};

export type ForgotPasswordSendCodeRequest = { email: string };
export type ForgotPasswordVerifyCodeRequest = { email: string; code: string };
export type ForgotPasswordResetPasswordRequest = {
  new_password: string;
  confirm_password: string;
};
