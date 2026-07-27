import { integer, pgTable, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core';

export const registrationEmailCodes = pgTable(
  'registration_email_codes',
  {
    id: uuid('id').primaryKey().notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    code_hash: varchar('code_hash', { length: 128 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expires_at: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    consumed_at: timestamp('consumed_at', { withTimezone: true, mode: 'string' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [index('registration_email_codes_email_active_idx').on(table.email, table.created_at)]
);
