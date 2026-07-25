INSERT INTO categories (id, name, description, active)
VALUES
  ('019f9749-7a00-7000-8000-000000000001', 'Antigo Testamento', 'Questões sobre os livros e acontecimentos do Antigo Testamento.', TRUE),
  ('019f9749-7a00-7000-8000-000000000002', 'Novo Testamento', 'Questões sobre os livros e acontecimentos do Novo Testamento.', TRUE),
  ('019f9749-7a00-7000-8000-000000000003', 'Personagens', 'Questões sobre personagens bíblicos.', TRUE),
  ('019f9749-7a00-7000-8000-000000000004', 'Geografia', 'Questões sobre lugares e regiões mencionados na Bíblia.', TRUE),
  ('019f9749-7a00-7000-8000-000000000005', 'Doutrina', 'Questões sobre ensinamentos e princípios bíblicos.', TRUE),
  ('019f9749-7a00-7000-8000-000000000006', 'Parábolas', 'Questões sobre as parábolas bíblicas.', TRUE)
ON CONFLICT (lower(name)) DO UPDATE
SET description = EXCLUDED.description,
    active = EXCLUDED.active;
