import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '@core/models/user/user.model.js';

export const passwordResetCodes = pgTable(
  'password_reset_codes',
  {
    id: uuid('id').primaryKey().notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code_hash: varchar('code_hash', { length: 128 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expires_at: timestamp('expires_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    consumed_at: timestamp('consumed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('password_reset_codes_user_active_idx').on(
      table.user_id,
      table.created_at
    ),
  ]
);
