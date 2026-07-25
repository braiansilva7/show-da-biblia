-- O país de origem é obrigatório para todo usuário. A criação do país padrão
-- preserva instalações antigas que ainda não possuíam o catálogo inicial.
INSERT INTO countries (id, iso_code, name, active)
VALUES ('019f9749-5ad7-72e2-ae84-59c73f79d2a0', 'BR', 'Brasil', TRUE)
ON CONFLICT (iso_code) DO NOTHING;

UPDATE users
SET country_id = (
  SELECT id
  FROM countries
  WHERE iso_code = 'BR'
)
WHERE country_id IS NULL;

ALTER TABLE users ALTER COLUMN country_id SET NOT NULL;
