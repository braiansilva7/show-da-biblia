# Show da Bíblia

Base inicial do jogo **Show da Bíblia**.

O projeto contém a `manager_api` mínima de autenticação, uma base web administrativa e
uma base mobile. Questões, partidas e ranking serão construídos nas próximas
etapas.

## Início rápido

1. Copie `.env.example` para `.env` e substitua todos os valores de exemplo.
2. Suba o banco e a API: `docker compose up --build -d`. O serviço `migrator`
   aplica as migrations pendentes antes de iniciar a API.

O administrador inicial é criado pela migration `002_seed_jokers_and_administrator.sql`.
Para executar migrations fora do Docker, use `pnpm install && pnpm migrate`.

Rotas disponíveis: `GET /health`, `POST /api/v1/auth/login` e
`GET /api/v1/auth/me`.
