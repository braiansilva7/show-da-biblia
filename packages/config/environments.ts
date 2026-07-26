import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, '../..');
dotenv.config({ path: resolve(projectRoot, '.env') });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`A variável de ambiente ${name} é obrigatória.`);
  return value;
}

function port(value: string | undefined, fallback = '3000'): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('Porta inválida.');
  }
  return parsed;
}

function nonNegativeInteger(
  name: string,
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `A variável de ambiente ${name} deve ser um inteiro não negativo.`
    );
  }
  return parsed;
}

export const databaseEnvironment = {
  databaseUrl: required('DATABASE_URL'),
};

export const s3Environment = {
  endpoint: required('S3_ENDPOINT'),
  accessKey: required('S3_ACCESS_KEY'),
  secretKey: required('S3_SECRET_KEY'),
  bucket: required('S3_BUCKET'),
  region: process.env.S3_REGION?.trim() || 'us-east-1',
  publicBaseUrl:
    process.env.S3_PUBLIC_BASE_URL?.trim() || required('S3_ENDPOINT'),
};

export function smtpEnvironment() {
  return {
    host: required('SMTP_HOST'),
    port: port(process.env.SMTP_PORT, '587'),
    user: required('SMTP_USER'),
    password: required('SMTP_PASSWORD'),
    from: required('SMTP_FROM'),
    secure: process.env.SMTP_SECURE?.trim() === 'true',
  };
}

/**
 * A chave exclusiva permite rotacionar códigos de recuperação sem rotacionar
 * sessões. Em instalações existentes, JWT_SECRET mantém o fluxo seguro até a
 * variável dedicada ser configurada.
 */
export function passwordResetEnvironment() {
  return {
    codeSecret:
      process.env.PASSWORD_RESET_CODE_SECRET?.trim() || required('JWT_SECRET'),
  };
}

export function managerApiEnvironment() {
  const appEnvironment = required('APP_ENVIRONMENT');
  if (!['LOCAL', 'DEV', 'HMG', 'PROD'].includes(appEnvironment)) {
    throw new Error('APP_ENVIRONMENT deve ser LOCAL, DEV, HMG ou PROD.');
  }
  return {
    appEnvironment: appEnvironment as 'LOCAL' | 'DEV' | 'HMG' | 'PROD',
    port: port(process.env.API_PORT),
    jwtSecret: required('JWT_SECRET'),
    jwtSecretExpiresIn: required('JWT_SECRET_EXPIRES_IN'),
    corsOrigin: required('CORS_ORIGIN'),
    jokerEliminationQuantity: nonNegativeInteger(
      'GAME_JOKER_ELIMINATION_QUANTITY',
      process.env.GAME_JOKER_ELIMINATION_QUANTITY,
      1
    ),
    jokerRevealQuantity: nonNegativeInteger(
      'GAME_JOKER_REVEAL_QUANTITY',
      process.env.GAME_JOKER_REVEAL_QUANTITY,
      1
    ),
  };
}
