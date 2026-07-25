ALTER TABLE categories DROP CONSTRAINT categories_name_unique;
CREATE UNIQUE INDEX categories_name_normalized_unique ON categories (lower(name));

INSERT INTO permissions(action)
VALUES
  ('categories.view'),
  ('categories.create'),
  ('categories.update'),
  ('categories.delete')
ON CONFLICT (action) DO NOTHING;

INSERT INTO permission_role_actions(permission_role_id, action)
SELECT '019f9749-7693-721f-a3c8-df32ca71b1fe'::uuid, action
FROM permissions
WHERE action IN ('categories.view', 'categories.create', 'categories.update', 'categories.delete')
ON CONFLICT DO NOTHING;
