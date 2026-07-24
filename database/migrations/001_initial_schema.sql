CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code VARCHAR(2) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT countries_iso_code_format CHECK (iso_code ~ '^[A-Z]{2}$'),
  CONSTRAINT countries_name_not_blank CHECK (btrim(name) <> '')
);

-- Compatibilidade com a tabela de usuários da primeira versão do projeto.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(120) NOT NULL UNIQUE,
      email VARCHAR(320) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL,
      country_id UUID,
      language_code VARCHAR(5) NOT NULL,
      profile_picture_url VARCHAR(2048),
      total_score INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
    ) THEN
      ALTER TABLE users RENAME COLUMN name TO username;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active'
    ) THEN
      ALTER TABLE users RENAME COLUMN is_active TO active;
    END IF;
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country_id UUID,
  ADD COLUMN IF NOT EXISTS language_code VARCHAR(5),
  ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS total_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Usuários legados não possuíam preferência de idioma. O valor temporário permite
-- a evolução sem dados nulos; novas inserções devem informar o idioma explicitamente.
UPDATE users
   SET language_code = 'pt-BR'
 WHERE language_code IS NULL;

ALTER TABLE users
  ALTER COLUMN language_code SET NOT NULL,
  ALTER COLUMN language_code DROP DEFAULT;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check,
  DROP CONSTRAINT IF EXISTS users_role_valid,
  DROP CONSTRAINT IF EXISTS users_language_code_valid,
  DROP CONSTRAINT IF EXISTS users_total_score_non_negative,
  DROP CONSTRAINT IF EXISTS users_country_id_fkey;

UPDATE users
   SET role = UPPER(role);

ALTER TABLE users
  ADD CONSTRAINT users_role_valid CHECK (role IN ('ADMIN', 'PLAYER')),
  ADD CONSTRAINT users_language_code_valid CHECK (language_code IN ('pt-BR', 'en', 'es')),
  ADD CONSTRAINT users_total_score_non_negative CHECK (total_score >= 0),
  ADD CONSTRAINT users_country_id_fkey FOREIGN KEY (country_id)
    REFERENCES countries(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_key ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_country_id_idx ON users (country_id);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(1000),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  difficulty_level SMALLINT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT questions_difficulty_level_valid CHECK (difficulty_level BETWEEN 1 AND 3),
  CONSTRAINT questions_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  CONSTRAINT questions_published_at_valid CHECK (
    (status = 'PUBLISHED' AND published_at IS NOT NULL)
    OR (status IN ('DRAFT', 'ARCHIVED'))
  )
);

CREATE INDEX IF NOT EXISTS questions_category_id_idx ON questions (category_id);
CREATE INDEX IF NOT EXISTS questions_created_by_user_id_idx ON questions (created_by_user_id);
CREATE INDEX IF NOT EXISTS questions_published_selection_idx
  ON questions (category_id, difficulty_level, published_at)
  WHERE status = 'PUBLISHED';

CREATE TABLE IF NOT EXISTS question_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  statement TEXT NOT NULL,
  explanation TEXT NOT NULL,
  CONSTRAINT question_translations_language_code_valid CHECK (language_code IN ('pt-BR', 'en', 'es')),
  CONSTRAINT question_translations_statement_not_blank CHECK (btrim(statement) <> ''),
  CONSTRAINT question_translations_explanation_not_blank CHECK (btrim(explanation) <> ''),
  CONSTRAINT question_translations_question_language_key UNIQUE (question_id, language_code)
);

CREATE INDEX IF NOT EXISTS question_translations_language_code_idx
  ON question_translations (language_code);

CREATE TABLE IF NOT EXISTS answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT answer_options_position_valid CHECK (position BETWEEN 1 AND 5),
  CONSTRAINT answer_options_question_position_key UNIQUE (question_id, position),
  CONSTRAINT answer_options_id_question_id_key UNIQUE (id, question_id)
);

-- A publicação valida se há uma correta; este índice impede haver duas corretas.
CREATE UNIQUE INDEX IF NOT EXISTS answer_options_one_correct_per_question_key
  ON answer_options (question_id)
  WHERE is_correct;

CREATE TABLE IF NOT EXISTS answer_option_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_option_id UUID NOT NULL REFERENCES answer_options(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  content TEXT NOT NULL,
  CONSTRAINT answer_option_translations_language_code_valid CHECK (language_code IN ('pt-BR', 'en', 'es')),
  CONSTRAINT answer_option_translations_content_not_blank CHECK (btrim(content) <> ''),
  CONSTRAINT answer_option_translations_option_language_key UNIQUE (answer_option_id, language_code)
);

CREATE INDEX IF NOT EXISTS answer_option_translations_language_code_idx
  ON answer_option_translations (language_code);

CREATE TABLE IF NOT EXISTS player_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  highest_unlocked_level SMALLINT NOT NULL DEFAULT 1,
  total_correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions_answered INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_progress_highest_unlocked_level_valid CHECK (highest_unlocked_level BETWEEN 1 AND 3),
  CONSTRAINT player_progress_total_correct_answers_valid CHECK (total_correct_answers >= 0),
  CONSTRAINT player_progress_total_questions_answered_valid CHECK (total_questions_answered >= 0),
  CONSTRAINT player_progress_correct_answers_valid CHECK (total_correct_answers <= total_questions_answered)
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  language_code VARCHAR(5) NOT NULL,
  current_level SMALLINT NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  skips_remaining SMALLINT NOT NULL DEFAULT 3,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT game_sessions_language_code_valid CHECK (language_code IN ('pt-BR', 'en', 'es')),
  CONSTRAINT game_sessions_current_level_valid CHECK (current_level BETWEEN 1 AND 3),
  CONSTRAINT game_sessions_skips_remaining_valid CHECK (skips_remaining BETWEEN 0 AND 3),
  CONSTRAINT game_sessions_status_valid CHECK (status IN ('IN_PROGRESS', 'FINISHED', 'ABANDONED')),
  CONSTRAINT game_sessions_finished_at_valid CHECK (
    (status = 'IN_PROGRESS' AND finished_at IS NULL)
    OR (status IN ('FINISHED', 'ABANDONED') AND finished_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS game_sessions_user_status_started_at_idx
  ON game_sessions (user_id, status, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_one_active_per_user_key
  ON game_sessions (user_id)
  WHERE status = 'IN_PROGRESS';

CREATE TABLE IF NOT EXISTS session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  difficulty_level SMALLINT NOT NULL,
  order_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  selected_answer_option_id UUID REFERENCES answer_options(id) ON DELETE RESTRICT,
  is_correct BOOLEAN,
  earned_points INTEGER NOT NULL DEFAULT 0,
  presented_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  CONSTRAINT session_questions_difficulty_level_valid CHECK (difficulty_level BETWEEN 1 AND 3),
  CONSTRAINT session_questions_order_number_valid CHECK (order_number > 0),
  CONSTRAINT session_questions_status_valid CHECK (status IN ('PENDING', 'ANSWERED', 'SKIPPED')),
  CONSTRAINT session_questions_game_session_order_key UNIQUE (game_session_id, order_number),
  CONSTRAINT session_questions_game_session_question_key UNIQUE (game_session_id, question_id),
  CONSTRAINT session_questions_resolution_valid CHECK (
    (status = 'PENDING' AND selected_answer_option_id IS NULL AND is_correct IS NULL
      AND answered_at IS NULL AND skipped_at IS NULL)
    OR (status = 'ANSWERED' AND selected_answer_option_id IS NOT NULL AND is_correct IS NOT NULL
      AND answered_at IS NOT NULL AND skipped_at IS NULL)
    OR (status = 'SKIPPED' AND selected_answer_option_id IS NULL AND is_correct IS NULL
      AND answered_at IS NULL AND skipped_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS session_questions_question_id_idx ON session_questions (question_id);
CREATE INDEX IF NOT EXISTS session_questions_pending_idx
  ON session_questions (game_session_id, order_number)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS joker_types (
  id SMALLINT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  eliminated_wrong_answers SMALLINT NOT NULL DEFAULT 0,
  reveals_correct_answer BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT joker_types_id_valid CHECK (id BETWEEN 1 AND 5),
  CONSTRAINT joker_types_code_valid CHECK (code IN ('ELIMINATE_1', 'ELIMINATE_2', 'ELIMINATE_3', 'ELIMINATE_4', 'REVEAL')),
  CONSTRAINT joker_types_configuration_valid CHECK (
    (code = 'ELIMINATE_1' AND eliminated_wrong_answers = 1 AND NOT reveals_correct_answer)
    OR (code = 'ELIMINATE_2' AND eliminated_wrong_answers = 2 AND NOT reveals_correct_answer)
    OR (code = 'ELIMINATE_3' AND eliminated_wrong_answers = 3 AND NOT reveals_correct_answer)
    OR (code = 'ELIMINATE_4' AND eliminated_wrong_answers = 4 AND NOT reveals_correct_answer)
    OR (code = 'REVEAL' AND eliminated_wrong_answers = 0 AND reveals_correct_answer)
  )
);

CREATE TABLE IF NOT EXISTS session_jokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  joker_type_id SMALLINT NOT NULL REFERENCES joker_types(id) ON DELETE RESTRICT,
  quantity_available SMALLINT NOT NULL DEFAULT 0,
  quantity_used SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT session_jokers_game_session_type_key UNIQUE (game_session_id, joker_type_id),
  CONSTRAINT session_jokers_quantity_available_valid CHECK (quantity_available >= 0),
  CONSTRAINT session_jokers_quantity_used_valid CHECK (quantity_used BETWEEN 0 AND quantity_available)
);

CREATE INDEX IF NOT EXISTS session_jokers_joker_type_id_idx ON session_jokers (joker_type_id);

CREATE TABLE IF NOT EXISTS joker_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_question_id UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
  joker_type_id SMALLINT NOT NULL REFERENCES joker_types(id) ON DELETE RESTRICT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT joker_usages_question_type_key UNIQUE (session_question_id, joker_type_id)
);

CREATE INDEX IF NOT EXISTS joker_usages_joker_type_id_idx ON joker_usages (joker_type_id);

CREATE TABLE IF NOT EXISTS joker_eliminated_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joker_usage_id UUID NOT NULL REFERENCES joker_usages(id) ON DELETE CASCADE,
  answer_option_id UUID NOT NULL REFERENCES answer_options(id) ON DELETE RESTRICT,
  CONSTRAINT joker_eliminated_options_usage_option_key UNIQUE (joker_usage_id, answer_option_id)
);

CREATE INDEX IF NOT EXISTS joker_eliminated_options_answer_option_id_idx
  ON joker_eliminated_options (answer_option_id);

CREATE TABLE IF NOT EXISTS score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE RESTRICT,
  session_question_id UUID NOT NULL REFERENCES session_questions(id) ON DELETE RESTRICT,
  points INTEGER NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT score_events_event_type_valid CHECK (event_type IN ('CORRECT_ANSWER', 'BONUS', 'PENALTY'))
);

CREATE INDEX IF NOT EXISTS score_events_user_created_at_idx ON score_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS score_events_game_session_id_idx ON score_events (game_session_id);
CREATE INDEX IF NOT EXISTS score_events_session_question_id_idx ON score_events (session_question_id);

CREATE OR REPLACE FUNCTION validate_selected_answer_option()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.selected_answer_option_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM answer_options
     WHERE id = NEW.selected_answer_option_id
       AND question_id = NEW.question_id
  ) THEN
    RAISE EXCEPTION 'A opção selecionada deve pertencer à questão da sessão.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_joker_eliminated_option()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM joker_usages
      JOIN session_questions ON session_questions.id = joker_usages.session_question_id
      JOIN answer_options ON answer_options.id = NEW.answer_option_id
     WHERE joker_usages.id = NEW.joker_usage_id
       AND answer_options.question_id = session_questions.question_id
       AND NOT answer_options.is_correct
  ) THEN
    RAISE EXCEPTION 'O curinga só pode eliminar uma opção incorreta da questão apresentada.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_score_event_context()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM game_sessions
      JOIN session_questions ON session_questions.game_session_id = game_sessions.id
     WHERE game_sessions.id = NEW.game_session_id
       AND game_sessions.user_id = NEW.user_id
       AND session_questions.id = NEW.session_question_id
  ) THEN
    RAISE EXCEPTION 'O evento de pontuação deve referenciar usuário, partida e questão da mesma sessão.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_questions_validate_selected_option ON session_questions;
CREATE TRIGGER session_questions_validate_selected_option
BEFORE INSERT OR UPDATE OF question_id, selected_answer_option_id ON session_questions
FOR EACH ROW EXECUTE FUNCTION validate_selected_answer_option();

DROP TRIGGER IF EXISTS joker_eliminated_options_validate_option ON joker_eliminated_options;
CREATE TRIGGER joker_eliminated_options_validate_option
BEFORE INSERT OR UPDATE OF joker_usage_id, answer_option_id ON joker_eliminated_options
FOR EACH ROW EXECUTE FUNCTION validate_joker_eliminated_option();

DROP TRIGGER IF EXISTS score_events_validate_context ON score_events;
CREATE TRIGGER score_events_validate_context
BEFORE INSERT OR UPDATE OF user_id, game_session_id, session_question_id ON score_events
FOR EACH ROW EXECUTE FUNCTION validate_score_event_context();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS questions_set_updated_at ON questions;
CREATE TRIGGER questions_set_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS player_progress_set_updated_at ON player_progress;
CREATE TRIGGER player_progress_set_updated_at
BEFORE UPDATE ON player_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
