INSERT INTO countries (id, iso_code, name, active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'BR', 'Brasil', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'US', 'United States', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'ES', 'España', TRUE)
ON CONFLICT (iso_code) DO UPDATE
SET name = EXCLUDED.name,
    active = TRUE;

INSERT INTO joker_types (id, code, eliminated_wrong_answers, reveals_correct_answer, active)
VALUES
  (1, 'ELIMINATE_1', 1, FALSE, TRUE),
  (2, 'ELIMINATE_2', 2, FALSE, TRUE),
  (3, 'ELIMINATE_3', 3, FALSE, TRUE),
  (4, 'ELIMINATE_4', 4, FALSE, TRUE),
  (5, 'REVEAL', 0, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE
SET code = EXCLUDED.code,
    eliminated_wrong_answers = EXCLUDED.eliminated_wrong_answers,
    reveals_correct_answer = EXCLUDED.reveals_correct_answer,
    active = EXCLUDED.active;

-- Senha: Gannicus#87 (scrypt com salt aleatório; nunca em texto puro no runtime).
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  role,
  country_id,
  language_code,
  active
)
VALUES (
  'a4c79f0f-8d7c-4a61-8112-b51e3c5ed0d0',
  'braian.diogenes',
  'braian.diogenes@gmail.com',
  'scrypt$OT2Jq6HUBY9xJVipXdUZJQ$62hGXBbkDDLEdoBefMNN-MUwwxWPKm6E7URH-NQNJAnMI9V8kWL2dzCpz0v2txiCVA4peoxt-6yeuhZ5VyX01A',
  'ADMIN',
  '11111111-1111-1111-1111-111111111111',
  'pt-BR',
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = 'ADMIN',
    country_id = EXCLUDED.country_id,
    language_code = EXCLUDED.language_code,
    active = TRUE;
