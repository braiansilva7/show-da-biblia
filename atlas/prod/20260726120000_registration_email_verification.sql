CREATE TABLE registration_email_codes (
  id uuid PRIMARY KEY,
  email varchar(320) NOT NULL,
  code_hash varchar(128) NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_email_codes_attempts_non_negative CHECK (attempts >= 0)
);
CREATE INDEX registration_email_codes_email_active_idx
  ON registration_email_codes (email, created_at DESC);
