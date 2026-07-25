-- Mantém o saldo disponível separado dos usos já realizados.
ALTER TABLE session_jokers
  DROP CONSTRAINT session_jokers_quantity_used_valid;

UPDATE session_jokers
SET quantity_available = quantity_available - quantity_used;

ALTER TABLE session_jokers
  ADD CONSTRAINT session_jokers_quantity_used_valid
  CHECK (quantity_used >= 0);

-- Preserva o histórico legado de ELIMINATE_4, mas o torna indisponível para
-- novas partidas. REVEAL passa a ter o código público estável REVEAL_ANSWER.
ALTER TABLE joker_types
  DROP CONSTRAINT joker_types_code_valid,
  DROP CONSTRAINT joker_types_configuration_valid;

UPDATE joker_types
SET code = 'REVEAL_ANSWER'
WHERE code = 'REVEAL';

UPDATE joker_types
SET active = FALSE
WHERE code = 'ELIMINATE_4';

ALTER TABLE joker_types
  ADD CONSTRAINT joker_types_code_valid
  CHECK (code IN ('ELIMINATE_1', 'ELIMINATE_2', 'ELIMINATE_3', 'ELIMINATE_4', 'REVEAL_ANSWER')),
  ADD CONSTRAINT joker_types_configuration_valid
  CHECK (
    (code = 'ELIMINATE_1' AND eliminated_wrong_answers = 1 AND NOT reveals_correct_answer)
    OR (code = 'ELIMINATE_2' AND eliminated_wrong_answers = 2 AND NOT reveals_correct_answer)
    OR (code = 'ELIMINATE_3' AND eliminated_wrong_answers = 3 AND NOT reveals_correct_answer)
    OR (code = 'ELIMINATE_4' AND eliminated_wrong_answers = 4 AND NOT reveals_correct_answer)
    OR (code = 'REVEAL_ANSWER' AND eliminated_wrong_answers = 0 AND reveals_correct_answer)
  );

-- Sessões existentes sem inventário recebem o padrão inicial: uma carta de
-- eliminação sorteada e uma carta de revelação. ON CONFLICT torna o
-- preenchimento seguro para bases parcialmente preenchidas.
WITH sessions_without_elimination AS (
  SELECT gs.id
  FROM game_sessions gs
  WHERE NOT EXISTS (
    SELECT 1
    FROM session_jokers sj
    JOIN joker_types jt ON jt.id = sj.joker_type_id
    WHERE sj.game_session_id = gs.id
      AND jt.code IN ('ELIMINATE_1', 'ELIMINATE_2', 'ELIMINATE_3')
  )
)
INSERT INTO session_jokers (id, game_session_id, joker_type_id, quantity_available, quantity_used)
SELECT gen_random_uuid(), id, (1 + floor(random() * 3))::smallint, 1, 0
FROM sessions_without_elimination
ON CONFLICT (game_session_id, joker_type_id) DO NOTHING;

INSERT INTO session_jokers (id, game_session_id, joker_type_id, quantity_available, quantity_used)
SELECT gen_random_uuid(), gs.id, jt.id, 1, 0
FROM game_sessions gs
JOIN joker_types jt ON jt.code = 'REVEAL_ANSWER'
WHERE NOT EXISTS (
  SELECT 1
  FROM session_jokers sj
  WHERE sj.game_session_id = gs.id
    AND sj.joker_type_id = jt.id
)
ON CONFLICT (game_session_id, joker_type_id) DO NOTHING;
