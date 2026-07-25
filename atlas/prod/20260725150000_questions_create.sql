INSERT INTO permissions(action)
VALUES ('questions.create')
ON CONFLICT (action) DO NOTHING;

INSERT INTO permission_role_actions(permission_role_id, action)
SELECT '019f9749-7693-721f-a3c8-df32ca71b1fe'::uuid, action
FROM permissions
WHERE action = 'questions.create'
ON CONFLICT DO NOTHING;
