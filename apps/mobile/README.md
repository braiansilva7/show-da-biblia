# Mobile — Show da Bíblia

Aplicativo Expo/React Native do jogador. Ele autentica, recupera a sessão de
forma segura e permite criar e editar o próprio perfil.

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
EXPO_PUBLIC_API_URL=http://192.168.1.7:3010/api/v1
```

`EXPO_PUBLIC_API_URL` deve terminar em `/api/v1`. O Mobile consome apenas as
rotas documentadas no Swagger: cadastro, login, recuperação de senha, sessão,
perfil e países.

`S3_PUBLIC_BASE_URL` é configurada no `.env` da raiz e define a URL pública
de imagens devolvida pela API. Ao testar em celular, ela deve usar o IP LAN do
computador (por exemplo, `http://192.168.1.3:9002`), nunca `localhost`.

Para abrir o Expo Web, a origem usada pelo navegador também precisa estar em
`CORS_ORIGIN` da raiz. Em desenvolvimento local, inclua
`http://localhost:8081` e `http://127.0.0.1:8081`; para testar em outro
dispositivo da rede, use o IP do computador, por exemplo
`http://192.168.1.7:8081`, tanto em `CORS_ORIGIN` quanto em
`EXPO_PUBLIC_API_URL`. Reinicie a API após alterar o `.env`.

## Estado atual

O shell inclui Boot, Login, Cadastro, Início, Partida, Resultado, Rankings e
Perfil. O token é guardado pelo `expo-secure-store`; no boot, o app consulta
`GET /auth/me`. Qualquer resposta HTTP 401 ou 403 apaga a sessão e retorna ao
login. A foto de perfil é enviada como `multipart/form-data` e exibida somente
pela URL pública devolvida pela API. No Android e iOS, a seleção da foto abre o
editor nativo com recorte quadrado para o avatar. No Web, o app abre seu
próprio editor quadrado antes de enviar a imagem.
Esse editor permite mover o quadrado de recorte e redimensioná-lo diretamente
por toque ou ponteiro.

`assets/icon.png` é o ícone oficial configurado no Expo para iOS, Android,
Android adaptativo e favicon do Web. A alteração é refletida em um novo build
ou após reinstalar o app nativo.

O Login inclui recuperação de senha por e-mail: informe o e-mail, valide o
código de seis dígitos e escolha uma nova senha. O token temporário desse fluxo
fica somente na memória do app; depois da troca, o app volta ao Login. A API
envia o código usando SMTP, configurado no `.env` da raiz com `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE` e
`PASSWORD_RESET_CODE_SECRET`. A última é recomendada; enquanto não for
configurada, a API usa `JWT_SECRET` para proteger os códigos.

Consulte [a arquitetura mobile](../../docs/MOBILE_ARCHITECTURE.md) antes de
adicionar telas, contratos ou integração de API.
