# Arquitetura do projeto — Show da Bíblia

## Objetivo

Este documento registra a organização de pastas e o modelo de dados atual do
Show da Bíblia. Deve ser consultado antes de criar domínios, rotas, telas,
models, migrations ou recursos de autorização.

## Estrutura de pastas

```text
show-da-biblia/
├── apps/
│   ├── manager_api/
│   │   └── src/
│   │       ├── controllers/       # Adaptadores HTTP por domínio
│   │       ├── permissions/       # Ações exigidas por rota
│   │       ├── plugins/           # Swagger e integrações da API
│   │       ├── routes/            # Registro de endpoints Fastify
│   │       └── types/             # Extensões dos tipos Fastify/JWT
│   ├── web/
│   │   └── src/
│   │       ├── assets/
│   │       │   ├── images/
│   │       │   │   ├── avatars/
│   │       │   │   ├── brand/
│   │       │   │   ├── cards/
│   │       │   │   ├── icons/payments/
│   │       │   │   ├── illustrations/
│   │       │   │   ├── misc/
│   │       │   │   ├── pages/
│   │       │   │   └── svg/
│   │       │   └── styles/variables/
│   │       ├── components/        # Componentes por domínio
│   │       ├── composables/       # Estado e acesso HTTP reutilizável
│   │       ├── layouts/           # Estrutura visual compartilhada
│   │       ├── navigation/        # Itens vertical e horizontal
│   │       ├── pages/             # Páginas de negócio
│   │       ├── plugins/i18n/      # Configuração e traduções web
│   │       ├── types/             # Contratos TypeScript
│   │       └── utils/             # Funções puras e formatadores
│   └── mobile/
│       ├── api/               # Adaptadores HTTP por recurso mobile
│       ├── assets/            # Recursos visuais do aplicativo
│       ├── components/        # Componentes React Native reutilizáveis
│       ├── constants/         # Configuração e valores globais
│       ├── context/           # Estado transversal de sessão e localização
│       ├── locales/           # Catálogos pt-BR, en e es
│       ├── navigation/        # Navegadores e contratos de rota
│       ├── screens/           # Telas e fluxos do jogador
│       ├── services/          # Operações de domínio mobile
│       ├── storage/           # Persistência local encapsulada
│       ├── theme/             # Tokens visuais compartilhados
│       ├── types/             # Contratos TypeScript do app
│       ├── utils/             # Funções puras
│       └── __tests__/         # Testes de módulos e contratos
├── packages/
│   ├── common/                    # Enums, tipos e funções comuns
│   ├── config/                    # Leitura e validação de ambiente
│   ├── interfaces/                # Interfaces de entrada compartilhadas
│   ├── middlewares/               # JWT, autorização e token de recuperação
│   ├── models/                    # Definição Drizzle das tabelas
│   ├── plugins/                   # Banco, i18n, S3, CORS e multipart
│   ├── repositories/              # Persistência por domínio
│   ├── schema/                    # Contratos Fastify e Swagger
│   ├── services/                  # Regras reutilizáveis, SMTP e recuperação
│   └── useCases/                  # Casos de uso por operação
├── atlas/
│   ├── prod/                      # Migrations de estrutura
│   └── seed/dev/                  # Dados de desenvolvimento
└── docs/
```

## Fluxo de uma rota

```text
Web Page/Component
        │
        ▼
Composable → /api/v1/... → Route → Controller → Use case → Service/Repository → Banco
                                      │
                                      ├── Schema Fastify/Swagger
                                      └── Middleware de permissão
```

As interfaces ficam em `packages/interfaces`; schemas em
`packages/schema`; mensagens visíveis devem estar nos arquivos de tradução
`pt`, `en` e `es` do backend e do web.

## Modelo de dados

### Visão visual

O diagrama abaixo é uma visão estática do banco. As setas apontam da tabela
filha (que guarda a chave estrangeira) para a tabela referenciada. Ele pode ser
aberto diretamente em qualquer navegador, sem depender de suporte a Mermaid.

![Diagrama relacional do banco de dados do Show da Bíblia](assets/database-schema.svg)

### Diagrama detalhado (Mermaid)

```mermaid
erDiagram
  COUNTRIES ||--o{ USERS : "country_id"
  USERS ||--|| PERMISSION_ASSIGNMENTS : "user_id"
  PERMISSION_ROLES ||--o{ PERMISSION_ASSIGNMENTS : "permission_role_id"
  PERMISSION_ROLES ||--o{ PERMISSION_ROLE_ACTIONS : "permission_role_id"
  PERMISSIONS ||--o{ PERMISSION_ROLE_ACTIONS : "action"

  USERS ||--o| PLAYER_PROGRESS : "user_id"
  USERS ||--o{ GAME_SESSIONS : "user_id"
  USERS ||--o{ QUESTIONS : "created_by_user_id"
  CATEGORIES ||--o{ QUESTIONS : "category_id"
  QUESTIONS ||--o{ QUESTION_TRANSLATIONS : "question_id"
  QUESTIONS ||--o{ ANSWER_OPTIONS : "question_id"
  ANSWER_OPTIONS ||--o{ ANSWER_OPTION_TRANSLATIONS : "answer_option_id"
  GAME_SESSIONS ||--o{ SESSION_QUESTIONS : "game_session_id"
  QUESTIONS ||--o{ SESSION_QUESTIONS : "question_id"
  ANSWER_OPTIONS ||--o{ SESSION_QUESTIONS : "selected_answer_option_id"
  GAME_SESSIONS ||--o{ SESSION_JOKERS : "game_session_id"
  JOKER_TYPES ||--o{ SESSION_JOKERS : "joker_type_id"
  SESSION_QUESTIONS ||--o{ JOKER_USAGES : "session_question_id"
  JOKER_TYPES ||--o{ JOKER_USAGES : "joker_type_id"
  JOKER_USAGES ||--o{ JOKER_ELIMINATED_OPTIONS : "joker_usage_id"
  ANSWER_OPTIONS ||--o{ JOKER_ELIMINATED_OPTIONS : "answer_option_id"
  USERS ||--o{ SCORE_EVENTS : "user_id"
  GAME_SESSIONS ||--o{ SCORE_EVENTS : "game_session_id"
  SESSION_QUESTIONS ||--o{ SCORE_EVENTS : "session_question_id"

  COUNTRIES {
    uuid id PK
    varchar iso_code UK
    varchar name
  }
  USERS {
    uuid id PK
    varchar username UK
    varchar email UK
    uuid country_id FK
    varchar language_code
    varchar profile_picture_url
    boolean active
  }
  PERMISSION_ROLES {
    uuid id PK
    varchar code UK
    varchar name UK
    boolean is_system
    boolean active
  }
  PERMISSIONS {
    varchar action PK
  }
  PERMISSION_ROLE_ACTIONS {
    uuid permission_role_id FK
    varchar action FK
  }
  PERMISSION_ASSIGNMENTS {
    uuid user_id PK, FK
    uuid permission_role_id FK
  }
  CATEGORIES {
    uuid id PK
    varchar name UK
  }
  QUESTIONS {
    uuid id PK
    uuid category_id FK
    uuid created_by_user_id FK
    varchar status
  }
  ANSWER_OPTIONS {
    uuid id PK
    uuid question_id FK
    smallint position
    boolean is_correct
  }
  GAME_SESSIONS {
    uuid id PK
    uuid user_id FK
    varchar status
  }
  SESSION_QUESTIONS {
    uuid id PK
    uuid game_session_id FK
    uuid question_id FK
  }
```

Cada questão publicada possui exatamente quatro alternativas, nas posições de
1 a 4, e somente uma delas deve ter `is_correct` como verdadeiro.

## Permissões

O acesso não depende de `ADMIN` ou `PLAYER` fixos no usuário. Cada usuário
possui uma atribuição em `permission_assignments`, vinculada a um papel em
`permission_roles`. As ações do papel são definidas por
`permission_role_actions`.

Catálogo inicial:

- `dashboard.view`
- `users.view`, `users.create`, `users.update`, `users.delete`
- `roles.view`, `roles.create`, `roles.update`, `roles.delete`,
  `roles.permissions`

Os papéis de sistema são Administrador e Jogador. Eles são protegidos contra
remoção e alteração.

## Cadastro de usuário, país e foto

Todo usuário possui obrigatoriamente um `country_id`, chave estrangeira para
`countries.id`, e um `language_code`, que define o idioma do jogo (`pt-BR`,
`en` ou `es`). O país representa a origem do usuário e não o idioma escolhido.

O Manager API disponibiliza `GET /api/v1/countries` para carregar somente os
países ativos no formulário administrativo. Criação e atualização validam que o
país informado existe e está ativo.

A foto é opcional e é recebida no campo multipart `profile_picture`. O backend
aceita JPEG, PNG, WEBP e GIF, com limite de 5 MB, armazena o objeto no MinIO em
`users/profile-pictures/<uuid-v7>.<extensão>` e salva apenas a URL pública em
`users.profile_picture_url`. Ao substituir ou excluir um usuário, o objeto
anterior é removido do MinIO.

## Progresso e partidas

Ao receber o papel de sistema `PLAYER`, o usuário ganha automaticamente um
único registro em `player_progress`, iniciado no nível 1 com os contadores em
zero. O registro é preservado caso o papel seja alterado depois, para não perder
o histórico do jogador.

As partidas começam com três pulos. As consultas de questões por partida e
status usam o índice `(game_session_id, status, order_number)`; o índice parcial
de questões pendentes continua atendendo a busca da próxima questão.

O pulo de uma questão marca o item atual como `SKIPPED`, reduz um pulo e cria
uma nova questão pendente da mesma dificuldade, sem repetir uma questão já
registrada na partida. A operação não altera pontuação nem cria eventos de
score; se não houver outra questão válida, a partida permanece inalterada.

## Coringas

Os coringas usam exclusivamente `joker_types`, `session_jokers`,
`joker_usages` e `joker_eliminated_options`. Ao iniciar uma partida, o
inicializador configurável atribui uma carta de eliminação sorteada entre
`ELIMINATE_1`, `ELIMINATE_2` e `ELIMINATE_3`, além de `REVEAL_ANSWER`.
As quantidades são definidas pelas variáveis `GAME_JOKER_ELIMINATION_QUANTITY`
e `GAME_JOKER_REVEAL_QUANTITY`, ambas com padrão `1`.

O uso só é permitido para a questão pendente da própria partida. Eliminações
registram apenas alternativas incorretas ainda não removidas; a revelação
retorna a alternativa correta sem expor o campo interno `is_correct`. Cada
uso reduz `quantity_available`, aumenta `quantity_used` e registra sua
rastreabilidade na mesma transação.

## Pontuação e ranking

Cada acerto vale um ponto. A partida possui três níveis de dez acertos; erro
ou expiração de um minuto encerra a sessão. `score_events` mantém a auditoria
dos pontos e `users.total_score` é apenas o cache derivado da maior pontuação
de uma partida finalizada. O melhor tempo é a duração da partida com mais
acertos e, em empate, a menor duração. O ranking é calculado sem tabelas
paralelas, com uma melhor partida por jogador ativo, filtrando país por
`country_id` quando nacional e desempate pelo menor tempo total.

## UUIDs e migrations

Todos os identificadores criados pela aplicação devem usar UUID v7, por meio de
`createUuidV7()` em `packages/common/functions/uuid.ts`. Seeds também devem
usar UUID v7 estático válido. Nunca introduzir `uuid.v4` ou
`gen_random_uuid()` em novos models, repositórios ou seeds.

Após alterar a estrutura:

```bash
pnpm migrate:local
# Para recriar a base local e reaplicar seeds:
pnpm seed:local
```

---

Documentação Show da Biblia — Arquitetura e banco de dados
