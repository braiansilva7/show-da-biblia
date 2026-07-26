ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 1;

CREATE TABLE password_reset_codes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash varchar(128) NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_codes_attempts_non_negative CHECK (attempts >= 0)
);
CREATE INDEX password_reset_codes_user_active_idx ON password_reset_codes (user_id, created_at DESC);
