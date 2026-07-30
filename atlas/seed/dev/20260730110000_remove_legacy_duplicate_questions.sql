-- Remove as 30 questões legadas que repetem o primeiro seed canônico.
--
-- A limpeza preserva o histórico das partidas: referências a questões e
-- alternativas legadas são remapeadas para seus equivalentes canônicos antes
-- da exclusão. Algumas partidas antigas receberam as duas versões da mesma
-- questão; essas ocorrências continuam registradas e são excluídas apenas do
-- índice de unicidade, sem abrir espaço para novas duplicações.

CREATE TEMP TABLE duplicate_question_map (
  duplicate_question_id uuid PRIMARY KEY,
  canonical_question_id uuid NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO duplicate_question_map (
  duplicate_question_id,
  canonical_question_id
)
SELECT
  duplicate_translation.question_id,
  canonical_translation.question_id
FROM question_translations duplicate_translation
JOIN question_translations canonical_translation
  ON canonical_translation.language_code = 'pt-BR'
 AND lower(regexp_replace(btrim(canonical_translation.statement), '\s+', ' ', 'g'))
     = lower(regexp_replace(btrim(duplicate_translation.statement), '\s+', ' ', 'g'))
WHERE duplicate_translation.language_code = 'pt-BR'
  AND duplicate_translation.question_id::text LIKE '019fa500-%'
  AND canonical_translation.question_id::text LIKE '019f9750-%';

DO $$
DECLARE
  duplicate_count integer;
  mapping_count integer;
BEGIN
  SELECT count(*)
    INTO duplicate_count
    FROM questions
   WHERE id::text LIKE '019fa500-%';

  SELECT count(*)
    INTO mapping_count
    FROM duplicate_question_map;

  IF duplicate_count <> mapping_count THEN
    RAISE EXCEPTION
      'Limpeza cancelada: % questões legadas encontradas, mas somente % pares canônicos foram identificados.',
      duplicate_count,
      mapping_count;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM duplicate_question_map mapping
     WHERE (
       SELECT count(*)
         FROM answer_options
        WHERE question_id = mapping.duplicate_question_id
     ) <> 4
        OR (
       SELECT count(*)
         FROM answer_options
        WHERE question_id = mapping.canonical_question_id
     ) <> 4
        OR EXISTS (
          SELECT 1
            FROM answer_options duplicate_option
            LEFT JOIN answer_options canonical_option
              ON canonical_option.question_id = mapping.canonical_question_id
             AND canonical_option.position = duplicate_option.position
           WHERE duplicate_option.question_id = mapping.duplicate_question_id
             AND (
               canonical_option.id IS NULL
               OR canonical_option.is_correct IS DISTINCT FROM duplicate_option.is_correct
             )
        )
  ) THEN
    RAISE EXCEPTION
      'Limpeza cancelada: as alternativas de uma questão legada não correspondem à versão canônica.';
  END IF;
END
$$;

CREATE TEMP TABLE duplicate_session_question_exceptions (
  session_question_id uuid PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO duplicate_session_question_exceptions (session_question_id)
SELECT duplicate_session_question.id
FROM session_questions duplicate_session_question
JOIN duplicate_question_map mapping
  ON mapping.duplicate_question_id = duplicate_session_question.question_id
WHERE EXISTS (
  SELECT 1
  FROM session_questions canonical_session_question
  WHERE canonical_session_question.game_session_id =
        duplicate_session_question.game_session_id
    AND canonical_session_question.question_id = mapping.canonical_question_id
);

DO $$
DECLARE
  excluded_ids text;
BEGIN
  IF EXISTS (SELECT 1 FROM duplicate_session_question_exceptions) THEN
    SELECT string_agg(
      quote_literal(session_question_id::text) || '::uuid',
      ', '
      ORDER BY session_question_id
    )
      INTO excluded_ids
      FROM duplicate_session_question_exceptions;

    ALTER TABLE session_questions
      DROP CONSTRAINT IF EXISTS session_questions_game_session_question_key;

    DROP INDEX IF EXISTS session_questions_game_session_question_key;

    EXECUTE format(
      'CREATE UNIQUE INDEX session_questions_game_session_question_key
         ON session_questions (game_session_id, question_id)
        WHERE id NOT IN (%s)',
      excluded_ids
    );
  END IF;
END
$$;

UPDATE session_questions session_question
SET
  question_id = mapping.canonical_question_id,
  selected_answer_option_id = (
    SELECT canonical_option.id
    FROM answer_options duplicate_selected_option
    JOIN answer_options canonical_option
      ON canonical_option.question_id = mapping.canonical_question_id
     AND canonical_option.position = duplicate_selected_option.position
    WHERE duplicate_selected_option.id =
          session_question.selected_answer_option_id
  )
FROM duplicate_question_map mapping
WHERE session_question.question_id = mapping.duplicate_question_id;

UPDATE joker_eliminated_options eliminated_option
SET answer_option_id = canonical_option.id
FROM answer_options duplicate_option
JOIN duplicate_question_map mapping
  ON mapping.duplicate_question_id = duplicate_option.question_id
JOIN answer_options canonical_option
  ON canonical_option.question_id = mapping.canonical_question_id
 AND canonical_option.position = duplicate_option.position
WHERE eliminated_option.answer_option_id = duplicate_option.id;

DELETE FROM questions duplicate_question
USING duplicate_question_map mapping
WHERE duplicate_question.id = mapping.duplicate_question_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM questions
     WHERE id::text LIKE '019fa500-%'
  ) THEN
    RAISE EXCEPTION
      'Limpeza incompleta: ainda existem questões legadas duplicadas.';
  END IF;

  IF EXISTS (
    SELECT normalized_statement
      FROM (
        SELECT lower(regexp_replace(btrim(statement), '\s+', ' ', 'g'))
                 AS normalized_statement
          FROM question_translations
         WHERE language_code = 'pt-BR'
      ) normalized_translations
     GROUP BY normalized_statement
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Limpeza incompleta: ainda existem enunciados pt-BR duplicados.';
  END IF;
END
$$;
