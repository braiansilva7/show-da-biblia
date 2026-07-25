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

`AppSessionContext` é provisório e mantido somente em memória. Quando a API de
autenticação estiver pronta, `storage/authStorage` deve usar armazenamento
seguro para token e `api/client` deve centralizar cabeçalhos, timeout e o
tratamento de respostas não autorizadas.

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
