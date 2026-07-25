INSERT INTO permissions(action)
VALUES
  ('questions.view'),
  ('questions.update'),
  ('questions.publish'),
  ('questions.archive'),
  ('questions.delete')
ON CONFLICT (action) DO NOTHING;

INSERT INTO permission_role_actions(permission_role_id, action)
SELECT '019f9749-7693-721f-a3c8-df32ca71b1fe'::uuid, action
FROM permissions
WHERE action IN (
  'questions.view',
  'questions.update',
  'questions.publish',
  'questions.archive',
  'questions.delete'
)
ON CONFLICT DO NOTHING;

CREATE INDEX questions_admin_list_idx
  ON questions (status, category_id, difficulty_level, created_at DESC);
