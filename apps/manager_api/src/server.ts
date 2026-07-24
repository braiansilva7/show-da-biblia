import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { apiConfig } from './config.js';
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  listUsers,
  pool,
  type User,
  type UserRole,
  updateUser,
} from './db.js';
import { hashPassword, verifyPassword } from './password.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { user_id: string; module: 'manager'; role: UserRole };
    user: { user_id: string; module: 'manager'; role: UserRole };
  }
}

function publicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    language_code: user.languageCode,
  };
}

function loginInput(value: unknown): { email: string; password: string } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const input = value as { email?: unknown; password?: unknown };
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  return email && password ? { email, password } : null;
}

function createUserInput(value: unknown): {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  languageCode: User['languageCode'];
} | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const input = value as {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
    language_code?: unknown;
  };
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const role = input.role === 'ADMIN' || input.role === 'PLAYER' ? input.role : null;
  const languageCode =
    input.language_code === 'pt-BR' || input.language_code === 'en' || input.language_code === 'es'
      ? input.language_code
      : null;

  if (
    username.length < 3 ||
    username.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 320 ||
    password.length < 8 ||
    password.length > 256 ||
    !role ||
    !languageCode
  ) {
    return null;
  }

  return { username, email, password, role, languageCode };
}

function updateUserInput(value: unknown):
  | Partial<{
      username: string;
      email: string;
      password: string;
      role: UserRole;
      languageCode: User['languageCode'];
      active: boolean;
    }>
  | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const input = value as {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
    language_code?: unknown;
    active?: unknown;
  };
  const output: Partial<{
    username: string;
    email: string;
    password: string;
    role: UserRole;
    languageCode: User['languageCode'];
    active: boolean;
  }> = {};

  if (input.username !== undefined) {
    if (typeof input.username !== 'string' || input.username.trim().length < 3 || input.username.trim().length > 120) return null;
    output.username = input.username.trim();
  }

  if (input.email !== undefined) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    output.email = email;
  }

  if (input.password !== undefined) {
    if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 256) return null;
    output.password = input.password;
  }

  if (input.role !== undefined) {
    if (input.role !== 'ADMIN' && input.role !== 'PLAYER') return null;
    output.role = input.role;
  }

  if (input.language_code !== undefined) {
    if (input.language_code !== 'pt-BR' && input.language_code !== 'en' && input.language_code !== 'es') return null;
    output.languageCode = input.language_code;
  }

  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') return null;
    output.active = input.active;
  }

  return Object.keys(output).length ? output : null;
}

function requestUserId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string') {
    return null;
  }

  return value.id;
}

async function authenticatedAdmin(request: { jwtVerify: () => Promise<void>; user: { user_id: string } }) {
  try {
    await request.jwtVerify();
  } catch {
    return null;
  }

  const user = await findUserById(request.user.user_id);

  return user?.active && user.role === 'ADMIN' ? user : null;
}

export function buildServer() {
  const config = apiConfig();
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtSecretExpiresIn },
  });

  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const input = loginInput(request.body);

    if (!input) {
      return reply.code(400).send({ message: 'E-mail e senha são obrigatórios.' });
    }

    const user = await findUserByEmail(input.email);
    const passwordMatches = user
      ? await verifyPassword(input.password, user.passwordHash)
      : false;

    if (!user || !user.active || !passwordMatches) {
      return reply.code(401).send({ message: 'Credenciais inválidas.' });
    }

    const accessToken = await reply.jwtSign(
      { user_id: user.id, module: 'manager', role: user.role }
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: config.jwtSecretExpiresIn,
      user: publicUser(user),
    };
  });

  app.get('/api/v1/auth/me', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ message: 'Token inválido ou expirado.' });
    }

    const user = await findUserById(request.user.user_id);

    if (!user || !user.active) {
      return reply.code(401).send({ message: 'Usuário não autorizado.' });
    }

    return { user: publicUser(user) };
  });

  app.get('/api/v1/users', async (request, reply) => {
    const admin = await authenticatedAdmin(request);

    if (!admin) {
      return reply.code(403).send({ message: 'Acesso restrito a administradores.' });
    }

    return { users: await listUsers() };
  });

  app.post('/api/v1/users', async (request, reply) => {
    const admin = await authenticatedAdmin(request);

    if (!admin) {
      return reply.code(403).send({ message: 'Acesso restrito a administradores.' });
    }

    const input = createUserInput(request.body);

    if (!input) {
      return reply.code(400).send({
        message:
          'Informe nome de usuário, e-mail válido, senha de ao menos 8 caracteres, perfil e idioma.',
      });
    }

    try {
      const user = await createUser({
        username: input.username,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        languageCode: input.languageCode,
      });

      return reply.code(201).send({ user });
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        return reply.code(409).send({ message: 'Já existe um usuário com este nome ou e-mail.' });
      }

      throw error;
    }
  });

  app.patch('/api/v1/users/:id', async (request, reply) => {
    const admin = await authenticatedAdmin(request);

    if (!admin) {
      return reply.code(403).send({ message: 'Acesso restrito a administradores.' });
    }

    const id = requestUserId(request.params);
    const input = updateUserInput(request.body);

    if (!id || !input) {
      return reply.code(400).send({ message: 'Informe ao menos um campo válido para edição.' });
    }

    if (id === admin.id && (input.active === false || input.role === 'PLAYER')) {
      return reply.code(400).send({
        message: 'Você não pode desativar nem remover o perfil administrador da própria conta.',
      });
    }

    try {
      const updatedUser = await updateUser(id, {
        username: input.username,
        email: input.email,
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
        role: input.role,
        languageCode: input.languageCode,
        active: input.active,
      });

      if (!updatedUser) {
        return reply.code(404).send({ message: 'Usuário não encontrado.' });
      }

      return { user: updatedUser };
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        return reply.code(409).send({ message: 'Já existe um usuário com este nome ou e-mail.' });
      }

      throw error;
    }
  });

  app.delete('/api/v1/users/:id', async (request, reply) => {
    const admin = await authenticatedAdmin(request);

    if (!admin) {
      return reply.code(403).send({ message: 'Acesso restrito a administradores.' });
    }

    const id = requestUserId(request.params);

    if (!id) {
      return reply.code(400).send({ message: 'Identificador de usuário inválido.' });
    }

    if (id === admin.id) {
      return reply.code(400).send({ message: 'Você não pode excluir a própria conta.' });
    }

    try {
      if (!(await deleteUser(id))) {
        return reply.code(404).send({ message: 'Usuário não encontrado.' });
      }

      return reply.code(204).send();
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23503') {
        return reply.code(409).send({
          message: 'Este usuário possui dados vinculados e não pode ser excluído. Desative-o em vez disso.',
        });
      }

      throw error;
    }
  });

  return app;
}

async function start() {
  const config = apiConfig();
  const app = buildServer();

  const shutdown = async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    await pool.end();
    process.exit(1);
  }
}

void start();
