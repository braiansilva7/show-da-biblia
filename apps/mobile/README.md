# Mobile — Show da Bíblia

Aplicativo Expo/React Native do jogador. Esta primeira entrega estabelece a
arquitetura e a navegação; ela não autentica nem faz chamadas para a API.

## Pré-requisitos

- Node `24.12.0` (conforme `.nvmrc` da raiz)
- Dependências instaladas na raiz: `pnpm install`

## Comandos

Execute a partir da raiz do monorepo:

- `pnpm dev:mobile` — inicia o Expo localmente
- `pnpm --filter @show-da-biblia/mobile android` — abre no Android
- `pnpm --filter @show-da-biblia/mobile ios` — abre no iOS
- `pnpm --filter @show-da-biblia/mobile web` — abre no navegador
- `pnpm --filter @show-da-biblia/mobile typecheck` — valida TypeScript
- `pnpm --filter @show-da-biblia/mobile test` — executa os testes
- `pnpm --filter @show-da-biblia/mobile build` — exporta a versão web

## Ambiente

Copie ou defina as variáveis públicas no ambiente de execução:

```text
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

`EXPO_PUBLIC_API_URL` é lida em `config.ts`, mas não é consumida nesta
fundação. A integração com autenticação e gameplay será implementada em uma
etapa posterior.

## Estado atual

O shell inclui Boot, Acesso, Início, Partida, Resultado, Rankings e Perfil.
O botão de acesso só libera a prévia de navegação em memória; não representa
autenticação real nem persiste uma sessão.

Consulte [a arquitetura mobile](../../docs/MOBILE_ARCHITECTURE.md) antes de
adicionar telas, contratos ou integração de API.
