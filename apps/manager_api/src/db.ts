import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { databaseConfig } from './config.js';

export type UserRole = 'ADMIN' | 'PLAYER';

export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  languageCode: 'pt-BR' | 'en' | 'es';
  active: boolean;
};

export type UserListItem = Omit<User, 'passwordHash' | 'languageCode'> & {
  language_code: User['languageCode'];
  createdAt: string;
};

export const pool = new Pool({ connectionString: databaseConfig.databaseUrl });

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role === 'ADMIN' ? 'ADMIN' : 'PLAYER',
    languageCode:
      row.language_code === 'en' || row.language_code === 'es' ? row.language_code : 'pt-BR',
    active: Boolean(row.active),
  };
}

function mapUserListItem(row: Record<string, unknown>): UserListItem {
  const user = mapUser(row);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    language_code: user.languageCode,
    active: user.active,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, password_hash, role, language_code, active
       FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [email]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, password_hash, role, language_code, active
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [id]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function listUsers(): Promise<UserListItem[]> {
  const result = await pool.query(
    `SELECT id, username, email, password_hash, role, language_code, active, created_at
       FROM users
      ORDER BY created_at DESC, username ASC`
  );

  return result.rows.map(mapUserListItem);
}

export async function createUser(input: {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  languageCode: User['languageCode'];
}): Promise<UserListItem> {
  const result = await pool.query(
    `INSERT INTO users (id, username, email, password_hash, role, language_code, active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING id, username, email, password_hash, role, language_code, active, created_at`,
    [
      randomUUID(),
      input.username,
      input.email.toLowerCase(),
      input.passwordHash,
      input.role,
      input.languageCode,
    ]
  );

  return mapUserListItem(result.rows[0]);
}

export async function updateUser(
  id: string,
  input: Partial<{
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    languageCode: User['languageCode'];
    active: boolean;
  }>
): Promise<UserListItem | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  function set(column: string, value: unknown) {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (input.username !== undefined) set('username', input.username);
  if (input.email !== undefined) set('email', input.email.toLowerCase());
  if (input.passwordHash !== undefined) set('password_hash', input.passwordHash);
  if (input.role !== undefined) set('role', input.role);
  if (input.languageCode !== undefined) set('language_code', input.languageCode);
  if (input.active !== undefined) set('active', input.active);

  if (!assignments.length) {
    return null;
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE users
        SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, username, email, password_hash, role, language_code, active, created_at`,
    values
  );

  return result.rows[0] ? mapUserListItem(result.rows[0]) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

  return result.rowCount === 1;
}
