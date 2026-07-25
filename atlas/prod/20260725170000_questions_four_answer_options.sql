DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM answer_options ao
    WHERE ao.position = 5
      AND ao.is_correct
  ) THEN
    RAISE EXCEPTION
      'Não é possível remover a alternativa 5 enquanto ela estiver marcada como correta.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM answer_options ao
    WHERE ao.position = 5
      AND (
        EXISTS (
          SELECT 1
          FROM session_questions sq
          WHERE sq.selected_answer_option_id = ao.id
        )
        OR EXISTS (
          SELECT 1
          FROM joker_eliminated_options jeo
          WHERE jeo.answer_option_id = ao.id
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Não é possível remover a alternativa 5 enquanto ela estiver vinculada ao histórico de uma partida.';
  END IF;
END;
$$;

DELETE FROM answer_options
WHERE position = 5;

ALTER TABLE answer_options
  DROP CONSTRAINT answer_options_position_valid,
  ADD CONSTRAINT answer_options_position_valid CHECK (position BETWEEN 1 AND 4);

CREATE OR REPLACE FUNCTION questions_validate_publication()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'PUBLISHED' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id)
     OR NEW.difficulty_level NOT BETWEEN 1 AND 3
     OR (SELECT count(*) FROM question_translations WHERE question_id = NEW.id AND language_code IN ('pt-BR', 'en', 'es')) <> 3
     OR (SELECT count(*) FROM answer_options WHERE question_id = NEW.id) <> 4
     OR (SELECT count(DISTINCT position) FROM answer_options WHERE question_id = NEW.id AND position BETWEEN 1 AND 4) <> 4
     OR (SELECT count(*) FROM answer_options WHERE question_id = NEW.id AND is_correct) <> 1
     OR (SELECT count(*) FROM answer_option_translations aot JOIN answer_options ao ON ao.id = aot.answer_option_id WHERE ao.question_id = NEW.id AND aot.language_code IN ('pt-BR', 'en', 'es')) <> 12
  THEN
    RAISE EXCEPTION 'QUESTION_PUBLISH_INCOMPLETE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
