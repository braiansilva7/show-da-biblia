# Arquitetura mobile — Show da Bíblia

## Objetivo

O mobile é um app Expo/React Native para jogadores. Sua estrutura replica a
separação por responsabilidade usada no mobile da Underchat, com nomes e
serviços ajustados ao domínio do jogo.

## Estrutura

```text
apps/mobile/
├── api/          # Cliente HTTP e adaptadores por recurso
├── assets/       # Recursos visuais estáticos
├── components/   # Blocos visuais reutilizáveis
├── constants/    # Valores globais e imutáveis
├── context/      # Estado transversal de sessão e localização
├── locales/      # Catálogos pt-BR, en e es
├── navigation/   # Navegadores e contratos tipados de rota
├── screens/      # Telas que coordenam fluxos
├── services/     # Operações de domínio que combinam API e estado
├── storage/      # Persistência local encapsulada
├── theme/        # Tokens visuais compartilhados
├── types/        # Contratos TypeScript do app
├── utils/        # Funções puras
└── __tests__/    # Testes de módulos e contratos
```

`App.tsx` somente compõe os provedores globais e decide o boot inicial. Tela
não chama API diretamente: tela → serviço → API/storage. Componentes não
conhecem navegação, rede ou persistência.

## Navegação e estado

O `RootNavigator` tem dois estados. Antes da sessão, a pessoa vê Acesso; após
a prévia de sessão, vê abas de Início, Rankings e Perfil. Partida é uma tela
empilhada e Resultado é apresentado como modal. Os parâmetros ficam em
`navigation/types.ts`; novas rotas devem ser declaradas ali antes do uso.

`AppSessionContext` recupera a sessão guardada em `expo-secure-store` e a
mantém bloqueada na abertura. Em dispositivos com biometria cadastrada, a
pessoa ativa esse login no Perfil; a reabertura do app e o retorno após ir ao
segundo plano solicitam a biometria automaticamente. Se a solicitação for
cancelada, a tela de Login ainda oferece o desbloqueio biométrico e o acesso
por e-mail e senha. Após a confirmação local, o app valida a sessão com
`GET /auth/me`. Em Web ou sem biometria disponível, o login por e-mail e senha
permanece o único fluxo. O logout remove a preferência biométrica junto da
sessão. `api/client` centraliza o bearer token e, em 401 ou 403, remove a sessão
antes de redirecionar ao login. A aplicação não interpreta permissões nem
reproduz regras de jogo.

Antes do login, `ForgotPassword` conduz a recuperação em três etapas: e-mail,
código de seis dígitos e nova senha. O token temporário devolvido após a
validação do código fica somente na memória da tela; ele nunca é persistido no
`expo-secure-store`. Ao concluir, o fluxo retorna ao Login.

## Autenticação e perfil

O app usa somente os contratos documentados no Swagger:

- `GET /public/countries` para o cadastro e seleção de país;
- `POST /auth/register` para criar uma conta de jogador; o servidor atribui o
  papel `PLAYER` e retorna a sessão;
- `POST /auth/login`, `GET /auth/me` e `PATCH /auth/me` para entrar, recuperar
  e editar a própria conta.
- `POST /auth/forgot-password/send-code`,
  `POST /auth/forgot-password/verify-code` e
  `POST /auth/forgot-password/reset-password` para recuperar a senha.

O backend envia o código por SMTP, armazena apenas seu hash e expira-o em dez
minutos. A troca de senha incrementa `session_version`; todos os JWTs emitidos
antes dela deixam de ser válidos. O token temporário de recuperação não é aceito
pelas rotas autenticadas comuns.

Cadastro e edição enviam `country_id`, `language_code` (`pt-BR`, `en` ou `es`)
e, opcionalmente, `profile_picture` multipart. O Mobile nunca envia papel,
permissão ou credenciais do MinIO; para a foto, usa apenas `profile_picture_url`.

## Idiomas e contratos

`pt-BR` é o fallback. Os três catálogos devem conter exatamente as mesmas
chaves; use `useLocalization().t('chave')` para textos visíveis. Não escreva
texto de interface diretamente em telas ou componentes.

Os tipos em `types/game.ts` são contratos do cliente, com nomes em camelCase.
Adaptadores em `api/` devem converter os payloads da API quando necessário, em
vez de espalhar o formato HTTP pelas telas.

## Como evoluir

1. Defina ou ajuste o contrato em `types/`.
2. Crie o adaptador HTTP em `api/` e exponha a operação por um serviço.
3. Mantenha a tela como coordenadora de estado visual e extraia blocos
   reutilizáveis para `components/`.
4. Declare a rota tipada, traduza todos os textos nos três catálogos e cubra a
   regra pura ou o contrato em `__tests__/`.
5. Execute typecheck, testes e export web antes de concluir.
