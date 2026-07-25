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
     OR (SELECT count(*) FROM answer_options WHERE question_id = NEW.id) <> 5
     OR (SELECT count(DISTINCT position) FROM answer_options WHERE question_id = NEW.id AND position BETWEEN 1 AND 5) <> 5
     OR (SELECT count(*) FROM answer_options WHERE question_id = NEW.id AND is_correct) <> 1
     OR (SELECT count(*) FROM answer_option_translations aot JOIN answer_options ao ON ao.id = aot.answer_option_id WHERE ao.question_id = NEW.id AND aot.language_code IN ('pt-BR', 'en', 'es')) <> 15
  THEN
    RAISE EXCEPTION 'QUESTION_PUBLISH_INCOMPLETE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER questions_validate_publication_trigger
BEFORE INSERT OR UPDATE OF status, category_id, difficulty_level ON questions
FOR EACH ROW EXECUTE FUNCTION questions_validate_publication();
