CREATE OR REPLACE FUNCTION ensure_player_progress_for_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM permission_roles
    WHERE id = NEW.permission_role_id
      AND code = 'PLAYER'
  ) THEN
    INSERT INTO player_progress (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER permission_assignments_ensure_player_progress
AFTER INSERT OR UPDATE OF permission_role_id ON permission_assignments
FOR EACH ROW EXECUTE FUNCTION ensure_player_progress_for_assignment();

INSERT INTO player_progress (user_id)
SELECT pa.user_id
FROM permission_assignments pa
INNER JOIN permission_roles pr ON pr.id = pa.permission_role_id
WHERE pr.code = 'PLAYER'
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX session_questions_game_session_status_order_idx
  ON session_questions (game_session_id, status, order_number);
