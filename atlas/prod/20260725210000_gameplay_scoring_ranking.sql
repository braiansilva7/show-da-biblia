ALTER TABLE game_sessions ADD COLUMN end_reason varchar(20) NULL;
UPDATE game_sessions SET end_reason = 'COMPLETED' WHERE status = 'FINISHED' AND end_reason IS NULL;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_end_reason_valid CHECK (end_reason IS NULL OR end_reason IN ('COMPLETED', 'WRONG_ANSWER', 'TIMEOUT'));

ALTER TABLE session_questions DROP CONSTRAINT session_questions_status_valid, DROP CONSTRAINT session_questions_resolution_valid;
ALTER TABLE session_questions ADD CONSTRAINT session_questions_status_valid CHECK (status IN ('PENDING', 'ANSWERED', 'SKIPPED', 'TIMED_OUT'));
ALTER TABLE session_questions ADD CONSTRAINT session_questions_resolution_valid CHECK (
  (status = 'PENDING' AND selected_answer_option_id IS NULL AND is_correct IS NULL AND answered_at IS NULL AND skipped_at IS NULL)
  OR (status = 'ANSWERED' AND selected_answer_option_id IS NOT NULL AND is_correct IS NOT NULL AND answered_at IS NOT NULL AND skipped_at IS NULL)
  OR (status = 'SKIPPED' AND selected_answer_option_id IS NULL AND is_correct IS NULL AND answered_at IS NULL AND skipped_at IS NOT NULL)
  OR (status = 'TIMED_OUT' AND selected_answer_option_id IS NULL AND is_correct IS NULL AND answered_at IS NOT NULL AND skipped_at IS NULL)
);

CREATE UNIQUE INDEX score_events_session_question_event_type_key ON score_events (session_question_id, event_type);
CREATE INDEX game_sessions_finished_ranking_idx ON game_sessions (user_id, score DESC, finished_at) WHERE status = 'FINISHED';

UPDATE users u SET total_score = COALESCE((SELECT MAX(gs.score) FROM game_sessions gs WHERE gs.user_id = u.id AND gs.status = 'FINISHED'), 0);
