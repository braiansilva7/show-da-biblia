CREATE INDEX questions_published_by_difficulty_idx
  ON questions (difficulty_level, published_at, id)
  WHERE status = 'PUBLISHED';
