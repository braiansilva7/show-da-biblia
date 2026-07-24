import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, '../../..');

dotenv.config({ path: resolve(projectRoot, '.env') });

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`A variável de ambiente ${name} é obrigatória.`);
  }

  return value;
}

function port(value: string | undefined): number {
  const parsed = Number(value ?? '3000');

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('API_PORT deve ser uma porta válida.');
  }

  return parsed;
}

function appEnvironment(): 'LOCAL' | 'DEV' | 'HMG' | 'PROD' {
  const value = required('APP_ENVIRONMENT');
  const validEnvironments = ['LOCAL', 'DEV', 'HMG', 'PROD'] as const;

  if (!validEnvironments.includes(value as (typeof validEnvironments)[number])) {
    throw new Error('APP_ENVIRONMENT deve ser LOCAL, DEV, HMG ou PROD.');
  }

  return value as 'LOCAL' | 'DEV' | 'HMG' | 'PROD';
}

export const databaseConfig = {
  databaseUrl: required('DATABASE_URL'),
};

export function apiConfig() {
  return {
    appEnvironment: appEnvironment(),
    port: port(process.env.API_PORT),
    jwtSecret: required('JWT_SECRET'),
    jwtSecretExpiresIn: required('JWT_SECRET_EXPIRES_IN'),
    corsOrigin: required('CORS_ORIGIN'),
  };
}
