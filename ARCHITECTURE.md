# Arquitetura — Kurio

Este documento descreve como a solução funciona por dentro: camadas, contratos REST e de
eventos, política de sessão, estado do carrinho, estratégia de cache, reconciliação entre REST
e Socket.IO, a camada de mocks (incluindo o transporte Socket.IO e suas limitações), decisões
de UX, desvios do Figma e limitações conhecidas. Setup, comandos, credenciais e cenários estão
no [`README.md`](./README.md).

- [1. Visão geral](#1-visão-geral)
- [2. Rotas](#2-rotas)
- [3. Contratos REST](#3-contratos-rest)
- [4. Eventos Socket.IO](#4-eventos-socketio)
- [5. Política de sessão](#5-política-de-sessão)
- [6. Estado do carrinho e cotação](#6-estado-do-carrinho-e-cotação)
- [7. Checkout e pedidos](#7-checkout-e-pedidos)
- [8. Cache, retries e sincronização](#8-cache-retries-e-sincronização)
- [9. Reconciliação REST ↔ Socket.IO](#9-reconciliação-rest--socketio)
- [10. Camada de mocks (MSW)](#10-camada-de-mocks-msw)
- [11. Interface, responsividade e acessibilidade](#11-interface-responsividade-e-acessibilidade)
- [12. Performance](#12-performance)
- [13. Testes](#13-testes)
- [14. Decisões de UX](#14-decisões-de-ux)
- [15. Desvios do Figma, assets e ajustes de acessibilidade](#15-desvios-do-figma-assets-e-ajustes-de-acessibilidade)
- [16. Limitações conhecidas](#16-limitações-conhecidas)

## 1. Visão geral

```
┌──────────────────────────────── navegador ────────────────────────────────┐
│ UI            routes/ (params, busca, guardas) → features/*/página        │
│               → components/ (apresentação, só props)                      │
│                         ▲ hooks de feature (queries.ts)                   │
│ Estado        TanStack Query — cache por identidade ◄─ realtime/sync.ts   │
│                         ▲                                    ▲            │
│ Transporte    Axios (lib/http)                  socket.io-client          │
│                         │ HTTP /api                          │ WebSocket  │
├─────────────────────────┼────────────────────────────────────┼────────────┤
│ Mocks (MSW)   service worker → handlers → domínio → banco em memória      │
│               banco → barramento de eventos → servidor Socket.IO simulado │
└───────────────────────────────────────────────────────────────────────────┘
```

Princípios que atravessam o projeto:

- **Um contrato, dois lados.** `src/contracts` contém esquemas zod e tipos de todos os recursos
  REST e eventos. A aplicação e os mocks importam os mesmos esquemas: uma mudança de contrato
  quebra o build dos dois lados.
- **Nenhum dado fictício fora de `src/mocks`.** Componentes, hooks e o cliente Axios não têm
  respostas embutidas nem caminhos alternativos. Com `VITE_ENABLE_MOCKS=false` o mesmo código
  fala com um backend real (`npm run build:backend`); o módulo de mocks é um _chunk_ separado
  que nem chega a ser baixado.
- **Eventos nunca chegam aos componentes.** O caminho é sempre
  `socket.io-client → guarda de eventos → sync.ts → cache do TanStack Query → UI`, o mesmo
  caminho de uma resposta REST.
- **Dinheiro é string.** Valores em ETH trafegam como strings decimais do transporte até o
  texto na tela. As contas usam `BigInt` em wei (`src/lib/money.ts`); `parseFloat` não é usado
  em nenhum ponto. Quantidades são inteiras.
- **A URL é o estado do catálogo.** Busca, filtros, ordenação e página vivem apenas na URL.
- **Apresentação separada de dados.** `features/<x>/components` recebem props; `api.ts` é a
  única porta para o Axios e `queries.ts` a única para o TanStack Query.

| Pasta             | Responsabilidade                                                                    |
| ----------------- | ----------------------------------------------------------------------------------- |
| `src/routes`      | Rotas por arquivo: validação de params/busca, guardas e a página correspondente     |
| `src/features`    | `catalog`, `cart`, `checkout`, `orders`, `auth`, `account`, `realtime`              |
| `src/contracts`   | Esquemas zod + tipos (REST e Socket.IO)                                             |
| `src/lib`         | `http` (Axios), `realtime` (Socket.IO), `money`, sessão, chaves de cache, URL       |
| `src/components`  | `ui/` (shadcn/ui tematizado), `icons/` (extraídos do Figma), `layout/`              |
| `src/mocks`       | Banco, domínio, handlers MSW, cenários, servidor Socket.IO simulado, painel "Mocks" |
| `src/app`         | Provedores, roteador, shell, efeitos globais (sessão e tempo real)                  |

## 2. Rotas

| Rota                    | Tela                                   | Acesso     | Estado na URL                                                                   |
| ----------------------- | -------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `/`                     | Início (destaques + catálogo)          | público    | `q`, `categoria*`, `rede*`, `precoMin`, `precoMax`, `aba`, `ordem`, `pagina`    |
| `/nft/$nftId`           | Detalhes do NFT                        | público    | `edicao`                                                                        |
| `/carrinho`             | Carrinho de NFTs                       | público    | —                                                                               |
| `/entrar`, `/cadastro`  | Login e cadastro                       | visitante  | `redirect` (caminho interno de retorno), `motivo=sessao-expirada`               |
| `/pagamento`            | Pagamento (dados, carteira, revisão)   | sessão     | —                                                                               |
| `/pedido/$orderId`      | Pedido: pendente, recusado ou recibo   | sessão     | —                                                                               |
| `/transacao/$hash`      | Explorador de blocos simulado          | sessão     | —                                                                               |
| `/conta/perfil`         | Perfil do colecionador, avatar e senha | sessão     | —                                                                               |
| `/conta/carteiras`      | Carteiras principal e secundária       | sessão     | —                                                                               |
| `/conta/favoritos`      | Favoritos                              | sessão     | —                                                                               |
| `/conta/atividade`      | Pedidos do colecionador                | sessão     | —                                                                               |
| `/em-breve/$secao`      | Áreas fora do escopo                   | público    | —                                                                               |
| qualquer outra          | Página 404                             | público    | —                                                                               |

`*` = chave repetível (`?categoria=musica&categoria=jogos`).

- **Validação da busca.** Cada rota tem um `validateSearch` que devolve **todas** as chaves
  conhecidas (`undefined` quando ausentes, inválidas ou iguais ao padrão). Valores inválidos na
  URL são descartados em vez de quebrar a página, e estados iguais produzem URLs iguais
  (padrões omitidos, listas ordenadas). `parseSearch`/`stringifySearch` próprios mantêm tudo
  como string — um preço `0.50` não vira número no caminho.
- **Catálogo.** Mudar qualquer filtro, a busca, a aba ou a ordenação zera `pagina`. A paginação
  usa âncoras reais (`<a href>`), então funciona com "abrir em nova aba" e com o histórico.
  A busca digitada atualiza a mesma entrada do histórico (com _debounce_); Enter cria uma nova.
- **Guarda das rotas privadas.** O layout sem caminho `_auth` chama `requireSession` em
  `beforeLoad`: sem sessão viva, redireciona para `/entrar?redirect=<origem>`. Depois do login o
  colecionador volta para onde estava. `redirect` só aceita caminhos internos (`safeRedirect`).
  Quem já está autenticado e abre `/entrar` ou `/cadastro` é levado direto ao destino.
- **Acesso direto e 404.** Todas as rotas funcionam por acesso direto e refresh (o servidor
  entrega `index.html` como _fallback_). Rotas desconhecidas e erros de carregamento têm
  componentes próprios (`src/app/route-fallbacks.tsx`).
- **Divisão de código.** `autoCodeSplitting` do plugin do TanStack Router gera um _chunk_ por
  rota.

## 3. Contratos REST

Base: `VITE_API_URL` (padrão `/api`). Corpo JSON em UTF-8. Os esquemas completos estão em
`src/contracts/*.ts` — os nomes citados abaixo são os dos esquemas exportados.

### 3.1 Convenções

| Aspecto            | Regra                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação       | `Authorization: Bearer <token>` (token opaco devolvido por `POST /session` e `POST /users`)                                                                     |
| Visitante          | `X-Cart-Token: <uuid>` identifica o carrinho antes do login                                                                                                    |
| Dinheiro           | `ethAmountSchema`: string decimal `^\d+(\.\d{1,18})?$`                                                                                                         |
| Datas              | ISO 8601 com _offset_                                                                                                                                          |
| Versão             | `version`: inteiro monotônico por recurso (NFT, carrinho, pedido, perfil, carteira, conexão). É o mesmo número carregado pelos eventos Socket.IO               |
| Paginação          | `{ items, page, pageSize, totalItems, totalPages }`                                                                                                            |
| Listas na consulta | Chaves repetidas: `?category=musica&category=jogos`                                                                                                            |
| Rastreamento       | Toda resposta traz `X-Request-Id`; erros repetem o valor em `requestId`                                                                                        |
| Erro               | `apiErrorSchema`: `{ code, message, fieldErrors?, details?, requestId? }`. `fieldErrors` mapeia campo → mensagens, exibidas junto ao campo correspondente      |

### 3.2 Recursos

**Sessão e conta**

| Método   | Caminho    | Corpo                   | Resposta             | Erros específicos                                         |
| -------- | ---------- | ----------------------- | -------------------- | --------------------------------------------------------- |
| `POST`   | `/users`   | `registerRequestSchema` | 201 `sessionSchema`  | 409 `EMAIL_TAKEN` · 409 `USERNAME_TAKEN` · 422            |
| `POST`   | `/session` | `loginRequestSchema`    | 201 `sessionSchema`  | 401 `INVALID_CREDENTIALS` · 422                           |
| `GET`    | `/session` | —                       | 200 `sessionSchema`  | 401 `UNAUTHENTICATED` · 401 `SESSION_EXPIRED`             |
| `DELETE` | `/session` | —                       | 204                  | — (idempotente)                                           |

Ao criar a sessão, a API funde o carrinho do visitante (`X-Cart-Token`) no carrinho da conta.
A sessão dura 30 minutos na simulação; `expiresAt` informa o instante exato.

**NFTs e destaques** (públicos)

| Método | Caminho        | Consulta / corpo      | Resposta                        | Erros           |
| ------ | -------------- | --------------------- | ------------------------------- | --------------- |
| `GET`  | `/nfts`        | `nftListParamsSchema` | 200 `nftListResponseSchema`     | 422             |
| `GET`  | `/nfts/:nftId` | —                     | 200 `nftDetailSchema`           | 404 `NOT_FOUND` |
| `GET`  | `/highlights`  | —                     | 200 `highlightsResponseSchema`  | —               |

`GET /nfts` aceita `q`, `category*`, `network*`, `priceMin`, `priceMax`, `tab`
(`todos|novos|em-alta`), `sort` (`recentes|preco-asc|preco-desc|nome-asc|nome-desc`),
`collection`, `exclude`, `page` e `pageSize` (padrão 9, máx. 48). A resposta inclui `facets`
(contagem por categoria e rede e os limites de preço), calculadas pelo servidor.

**Favoritos** (sessão)

| Método   | Caminho             | Resposta                      | Erros           |
| -------- | ------------------- | ----------------------------- | --------------- |
| `GET`    | `/favorites`        | 200 `favoritesResponseSchema` | 401             |
| `PUT`    | `/favorites/:nftId` | 200 `favoritesResponseSchema` | 401 · 404       |
| `DELETE` | `/favorites/:nftId` | 200 `favoritesResponseSchema` | 401             |

`PUT` e `DELETE` são idempotentes e devolvem a lista inteira, que substitui a entrada do cache.

**Carrinho** (visitante ou sessão)

| Método   | Caminho               | Corpo                         | Resposta         | Erros específicos                                              |
| -------- | --------------------- | ----------------------------- | ---------------- | -------------------------------------------------------------- |
| `GET`    | `/cart`               | —                             | 200 `cartSchema` | —                                                              |
| `POST`   | `/cart/items`         | `addCartItemRequestSchema`    | 201 `cartSchema` | 404 · 409 `INSUFFICIENT_AVAILABILITY` · 409 `EDITION_UNAVAILABLE` |
| `PATCH`  | `/cart/items/:itemId` | `updateCartItemRequestSchema` | 200 `cartSchema` | 404 · 409 `INSUFFICIENT_AVAILABILITY` · 409 `EDITION_UNAVAILABLE` |
| `DELETE` | `/cart/items/:itemId` | —                             | 200 `cartSchema` | 404                                                            |
| `PUT`    | `/cart/coupon`        | `applyCouponRequestSchema`    | 200 `cartSchema` | 422 `COUPON_INVALID` · 422 `COUPON_EXPIRED` (com `fieldErrors.code`) |
| `DELETE` | `/cart/coupon`        | —                             | 200 `cartSchema` | —                                                              |

A linha do carrinho é identificada por NFT + edição (`<nftId>:<editionId>`). `available` e
`maxQuantity` de cada linha refletem a disponibilidade **daquela edição** naquele instante.

**Cotação**

| Método | Caminho   | Corpo                      | Resposta          |
| ------ | --------- | -------------------------- | ----------------- |
| `POST` | `/quotes` | `createQuoteRequestSchema` | 201 `quoteSchema` |

A cotação é o retrato precificado do carrinho e a **única fonte de valores monetários da UI**:
`items`, `coupon`, `subtotal`, `discount`, `networkFee`, `total`, `purchasable` e `issues`.
`fingerprint` é um hash de tudo o que afeta o total (linhas, preços, situação de estoque, cupom
e taxa): duas cotações com o mesmo `fingerprint` são equivalentes. Ao enviar
`previousFingerprint`, a resposta lista em `issues` o que mudou desde então (`price_changed`,
`insufficient_availability`, `edition_unavailable`, `coupon_expired`, `coupon_invalid`,
`fee_changed`, `item_removed`), cada item marcado como bloqueante ou informativo.

**Pedidos** (sessão)

| Método | Caminho               | Corpo / cabeçalhos                             | Resposta                              |
| ------ | --------------------- | ---------------------------------------------- | ------------------------------------- |
| `POST` | `/orders`             | `createOrderRequestSchema` + `Idempotency-Key` | 201 `orderSchema` (pedido `pending`)  |
| `GET`  | `/orders`             | `?status=pending\|confirmed\|declined`         | 200 `orderListResponseSchema`         |
| `GET`  | `/orders/:orderId`    | —                                              | 200 `orderSchema` (estado e recibo)   |
| `GET`  | `/transactions/:hash` | —                                              | 200 `simulatedTransactionSchema`      |

Regras de `POST /orders`, na ordem em que são avaliadas:

1. **Idempotência.** Mesma chave + mesmo corpo → 200 com o pedido criado na primeira chamada e
   `Idempotent-Replayed: true`, qualquer que seja o estado atual dele. Mesma chave + corpo
   diferente → 409 `IDEMPOTENCY_KEY_REUSED`. Sem o cabeçalho → 422.
2. **Um pedido pendente por colecionador.** Havendo outro pedido `pending` → 409
   `ORDER_PENDING` (`details.orderId`).
3. Carrinho vazio → 409 `CART_EMPTY`. Carteira não conectada → 409 `WALLET_DISCONNECTED`.
4. **Revalidação.** A API recalcula a cotação contra o catálogo naquele instante (preço,
   disponibilidade, cupom e taxa). Se o `quoteFingerprint` enviado não corresponder, ou se algo
   bloquear a compra → 409 `QUOTE_STALE` com a cotação nova em `details.quote`. Nenhum pedido é
   criado.
5. O pedido nasce `pending`, com um **retrato** dos itens e valores, e o estoque fica reservado.
   A liquidação é assíncrona: `confirmed` (remove do carrinho só os itens e quantidades
   comprados e gera a transação simulada) ou `declined` (devolve o estoque; o carrinho fica
   intacto). `confirmed` e `declined` são terminais.

`GET /orders/:orderId` responde 403 `FORBIDDEN` para pedido de outra conta e 404 para pedido
inexistente. O recibo é o próprio retrato do pedido: mudanças posteriores no catálogo não o
alteram. `transaction` (`hash`, `explorerName`, `explorerUrl`) só existe em pedidos confirmados;
hash, bloco e endereços são gerados pela simulação e o link de exploração aponta para uma
página interna (`/transacao/$hash`).

**Perfil** (sessão)

| Método   | Caminho             | Corpo                                    | Resposta            | Erros específicos                              |
| -------- | ------------------- | ---------------------------------------- | ------------------- | ---------------------------------------------- |
| `GET`    | `/profile`          | —                                        | 200 `profileSchema` | 401                                            |
| `PUT`    | `/profile`          | `updateProfileRequestSchema`             | 200 `profileSchema` | 409 `EMAIL_TAKEN` · 409 `USERNAME_TAKEN` · 422 |
| `PUT`    | `/profile/avatar`   | `multipart/form-data`, parte `file`      | 200 `profileSchema` | 422 (tipo diferente de PNG/JPEG/WebP ou > 2 MB) |
| `DELETE` | `/profile/avatar`   | —                                        | 200 `profileSchema` | —                                              |
| `PUT`    | `/profile/password` | `changePasswordRequestSchema`            | 204                 | 422 `WRONG_PASSWORD` · 422                     |

**Carteiras** (sessão)

| Método   | Caminho                              | Corpo                        | Resposta                             | Erros específicos                                         |
| -------- | ------------------------------------ | ---------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `GET`    | `/wallets`                           | —                            | 200 `walletsResponseSchema`          | 401                                                       |
| `POST`   | `/wallets`                           | `createWalletRequestSchema`  | 201 `walletSchema`                   | 409 `WALLET_ROLE_TAKEN` · 409 `WALLET_ADDRESS_TAKEN` · 422 |
| `PUT`    | `/wallets/:walletId`                 | `updateWalletRequestSchema`  | 200 `walletSchema`                   | 403 · 404 · 409 `WALLET_ADDRESS_TAKEN` · 422              |
| `GET`    | `/wallet-connections/current`        | —                            | 200 `activeConnectionResponseSchema` | 401                                                       |
| `POST`   | `/wallet-connections`                | `connectWalletRequestSchema` | 201 `walletConnectionSchema`         | 403 `WALLET_CONNECTION_REJECTED` · 422                    |
| `DELETE` | `/wallet-connections/:connectionId`  | —                            | 204                                  | —                                                         |

Cada conta tem no máximo uma carteira `primary` e uma `secondary`. O endereço é validado
conforme a rede (`0x` + 40 hexadecimais em Ethereum/Polygon; base58 de 32 a 44 caracteres em
Solana) pelo mesmo esquema no formulário e na API. `wallet-connections` simula o vínculo com o
aplicativo da carteira (conectar, recusar, desconectar) — nenhuma extensão real é usada.

### 3.3 Erros

| Situação exigida pelo enunciado | Status | Códigos                                                                                                                                   |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Validação                       | 422    | `VALIDATION_ERROR` (com `fieldErrors`), `COUPON_INVALID`, `COUPON_EXPIRED`, `WRONG_PASSWORD`                                              |
| Sessão inválida                 | 401    | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS`                                                                               |
| Falta de permissão              | 403    | `FORBIDDEN`, `WALLET_CONNECTION_REJECTED`                                                                                                 |
| Recurso inexistente             | 404    | `NOT_FOUND`                                                                                                                               |
| Conflito                        | 409    | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `WALLET_ROLE_TAKEN`, `WALLET_ADDRESS_TAKEN`, `INSUFFICIENT_AVAILABILITY`, `EDITION_UNAVAILABLE`, `QUOTE_STALE`, `QUOTE_EXPIRED`, `CART_EMPTY`, `ORDER_PENDING`, `IDEMPOTENCY_KEY_REUSED`, `WALLET_DISCONNECTED` |
| Falha transitória               | 5xx    | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`                                                                                                   |

No cliente, toda falha vira uma de três classes (`src/lib/http/errors.ts`): `ApiError`
(resposta com o envelope acima), `NetworkError` (nenhuma resposta) ou `TimeoutError` (15 s sem
resposta). As features nunca inspecionam objetos do Axios. Um cancelamento pedido pelo
TanStack Query é preservado como cancelamento, para que a resposta obsoleta seja descartada
em silêncio.

## 4. Eventos Socket.IO

Namespace `/`, somente servidor → cliente. O cliente autentica pelo _handshake_
(`auth: { token }`) e não emite eventos. Esquemas em `src/contracts/events.ts`.

Envelope comum:

| Campo        | Significado                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------- |
| `id`         | Identidade estável do evento. Uma reentrega carrega o mesmo `id`                              |
| `type`       | Nome do evento                                                                                |
| `resource`   | Recurso afetado: `{ type, id }`                                                               |
| `version`    | Versão do recurso **depois** da mudança — o mesmo `version` do recurso na API REST            |
| `occurredAt` | Instante da mudança                                                                           |
| `userId`     | Presente nos eventos privados; identifica o dono                                              |

| Evento           | Recurso             | Privado | `data`                                                                                                  | Efeito no cliente                                                                                           |
| ---------------- | ------------------- | ------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `nft.updated`    | `nft`               | não     | `nftId`, `name`, `price`, `previousPrice`, `compareAtPrice`, `available`, `previousAvailable`, `editions` | Atualiza preço e disponibilidade no catálogo, no detalhe, nos favoritos e no carrinho; avisa o colecionador |
| `order.updated`  | `order`             | sim     | `orderId`, `status`, `declineReason`, `statusMessage`, `transaction`, `settledAt`, `updatedAt`          | Atualiza o estado do pedido e apresenta a confirmação (recibo) ou a recusa                                  |
| `wallet.updated` | `wallet-connection` | sim     | `connectionId`, `walletId`, `status`                                                                    | Marca a carteira como desconectada e bloqueia a confirmação até reconectar                                  |

**Tolerância a duplicatas e eventos antigos** (`src/lib/realtime/event-guard.ts`, com testes
de unidade):

- um `id` já visto é `duplicate` (são lembrados os últimos 500);
- um evento cuja `version` não é maior que a última aplicada ao mesmo recurso é `stale`;
- toda resposta REST informa a versão que trouxe (`realtime.observe`), elevando o piso daquele
  recurso: um evento atrasado não desfaz um dado mais novo obtido por REST;
- só eventos `accepted` chegam ao cache. Além disso, cada escrita no cache confere a versão da
  entrada (`nft.version < event.version`), então reaplicar é inofensivo.

**Isolamento entre sessões.** Há um socket por identidade. Quando a sessão começa ou termina, o
socket anterior é fechado com todos os _listeners_ removidos e um novo faz o _handshake_ com o
token atual. Mesmo que um evento privado chegue a um socket errado (o cenário de teste
`broadcast` força isso), o cliente o descarta como `foreign` ao comparar `userId` com o usuário
da sessão em tela. O servidor simulado, por sua vez, só entrega eventos privados aos sockets do
dono.

**Ciclo de vida.** `startRealtimeSync` devolve a função de desmontagem que remove os
_listeners_ e fecha o socket; ela é o retorno do `useEffect` que abre a conexão
(`src/app/app-effects.tsx`).

## 5. Política de sessão

- **O que é guardado.** `localStorage['kurio.session']` contém `{ token, userId, expiresAt }`.
  A senha nunca é armazenada nem trafega fora do corpo de login/cadastro; o objeto do usuário é
  estado de servidor (`GET /session`) e vive no cache do TanStack Query. Na simulação, as contas
  guardam apenas sal + hash PBKDF2-SHA-256 da senha — inclusive as fixtures e o que é persistido
  em `localStorage`.
- **Sempre existe uma identidade.** Um visitante tem um _cart token_ (`kurio.cart-token`); um
  colecionador autenticado tem a sessão. O _escopo_ (`user:<id>` ou `guest:<token>`) faz parte
  de toda chave de cache privada.
- **Recuperação após refresh.** A sessão é lida do `localStorage` de forma síncrona antes da
  primeira renderização, então rotas privadas abrem direto. `GET /session` valida o token em
  segundo plano.
- **Expiração.** Três mecanismos levam ao mesmo ponto (`sessionStore.end('expired')`):
  1. um temporizador dispara no instante de `expiresAt`;
  2. os guardas de rota conferem `expiresAt` antes de entrar em uma rota privada;
  3. qualquer resposta 401 a uma requisição enviada com o token atual encerra a sessão. Um 401
     atrasado, de uma requisição feita com um token antigo, é ignorado.
- **Ao expirar,** o colecionador é avisado; se estiver em uma rota privada vai para
  `/entrar?redirect=<origem>&motivo=sessao-expirada` e, após o login, volta para onde estava.
  No checkout, o que foi digitado (rascunho) e a tentativa de compra em andamento são
  preservados em `sessionStorage` e restaurados **somente para o mesmo usuário**.
- **Logout e troca de usuário.** As requisições privadas em voo são canceladas e toda a
  subárvore `['private', <escopo anterior>]` é removida do cache; o rascunho do checkout e a
  tentativa de compra são apagados; o socket da identidade anterior é fechado. Ao entrar,
  qualquer cache privado remanescente é descartado antes de a nova sessão começar. Toda escrita
  assíncrona no cache confere se o escopo ainda é o atual (`isCurrentScope`) — uma resposta que
  chega depois da troca de usuário não é gravada.
- **Entre abas.** O evento `storage` propaga logout, login e troca de usuário para as demais
  abas, que passam pelo mesmo encerramento.
- **Logout sempre funciona.** A sessão local termina mesmo que `DELETE /session` falhe.

## 6. Estado do carrinho e cotação

- **O carrinho mora no servidor**, para visitantes (`X-Cart-Token`) e para sessões. O cliente só
  mantém a resposta em cache, sob o escopo da identidade — por isso sobrevive a refresh e é
  preservado ao autenticar (a API funde o carrinho do visitante no da conta).
- **Toda mutation devolve o carrinho inteiro**, que substitui a entrada do cache.
- **Mutations em fila.** As mutations do carrinho compartilham um `scope` do TanStack Query e
  rodam uma por vez, na ordem em que o colecionador agiu. Enquanto houver várias na fila só a
  última resposta é gravada: as anteriores descrevem um estado já superado.
- **Atualização otimista com rollback** em alterar quantidade e remover item (além dos
  favoritos, seção 8): a linha reage na hora e volta ao valor anterior se a API recusar.
  Um conflito de estoque (`INSUFFICIENT_AVAILABILITY`, `EDITION_UNAVAILABLE`) também
  ressincroniza carrinho e catálogo.
- **Totais nunca são calculados no cliente.** Subtotal, desconto, taxa de rede e total vêm da
  cotação (`POST /quotes`). A chave da cotação inclui a rede e a versão do carrinho: uma mudança
  feita pelo colecionador cria outra entrada; uma mudança do mundo (preço, estoque, cupom,
  taxa) atualiza a mesma entrada.
- **Mudanças que exigem ciência** (`src/features/cart/review.ts`). O cliente guarda, por
  identidade e rede, o `fingerprint` da última cotação vista. Uma cotação com `fingerprint`
  diferente, sem mudança do próprio colecionador no meio, é uma mudança externa: fica listada
  ("o preço de X mudou de A para B") até ser aceita. Mudanças no mesmo item se fundem (o "antes"
  mais antigo com o "depois" mais novo) e uma mudança que volta ao valor original se cancela.

## 7. Checkout e pedidos

Fluxo: dados do colecionador → carteira e rede → **revisão** (diálogo) → envio → pedido
pendente → recibo ou recusa.

- **Validação.** O formulário usa o mesmo `collectorSchema` que a API; erros devolvidos pela API
  (`fieldErrors`) são associados aos campos.
- **Carteira.** As carteiras cadastradas preenchem o formulário; também é possível digitar outra
  carteira para a compra. A conexão é simulada por `POST /wallet-connections` (aprovação, recusa)
  e a desconexão chega por `wallet.updated`. Sem carteira conectada a confirmação fica bloqueada.
- **Revalidação antes de confirmar.** A revisão abre com uma cotação recém-obtida. Se algo mudar
  enquanto ela está aberta (evento em tempo real) ou no envio (409 `QUOTE_STALE`), o diálogo
  mostra o que mudou e o botão de pagar fica desabilitado até o colecionador aceitar os novos
  valores; itens esgotados bloqueiam a compra até serem removidos.
- **Pedido único** — três camadas:
  1. a ação fica desabilitada enquanto há requisição em voo, e uma trava síncrona por página
     descarta um segundo clique que chegue antes da nova renderização;
  2. toda requisição da mesma tentativa leva a mesma `Idempotency-Key` e o mesmo corpo. A
     tentativa (`chave + corpo`) fica em `sessionStorage` até uma resposta **definitiva**;
     timeout, queda de conexão, 5xx ou um reload no meio do envio a deixam como "resultado
     desconhecido", e a tela oferece "Verificar e concluir", que reenvia exatamente o mesmo par
     e recupera o mesmo pedido;
  3. a API recusa um segundo pedido enquanto houver um pendente (`ORDER_PENDING`), o que cobre
     até a perda do `sessionStorage`.
- **Estados do pedido.** `/pedido/$orderId` mostra pendente, recusado ou o recibo. A
  confirmação só aparece quando a API (por evento ou por REST) informa `confirmed` — nunca é
  presumida pelo cliente.
- **Recuperação.** Depois de um refresh a página busca o pedido por REST. Com o socket fora do
  ar, um pedido pendente é consultado a cada 5 s; ao reconectar, tudo o que está em tela é
  revalidado. Um pedido liquidado nunca mais é refeito (`staleTime: Infinity`).
- **Carrinho após a compra.** Em falhas, o carrinho fica intacto. Após a confirmação, a API
  remove apenas os itens e quantidades comprados — algo adicionado depois de criar o pedido
  permanece.

## 8. Cache, retries e sincronização

Padrões (`src/app/query-client.ts`):

| Opção                                         | Valor                                                                 | Motivo                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `staleTime`                                   | 30 s                                                                  | Navegar de volta é instantâneo; nesse intervalo os eventos mantêm preço e estoque atualizados     |
| `gcTime`                                      | 5 min                                                                 | Telas visitadas há pouco reabrem com dados, atualizados em segundo plano                         |
| `retry` (queries)                             | 1 nova tentativa após 1 s, **só** para falha transitória              | Sem conexão, timeout e 5xx podem passar sozinhos; 4xx é definitivo e não é repetido              |
| `retry` (mutations)                           | nunca                                                                 | Repetir às cegas poderia duplicar uma operação; a compra se recupera pela chave de idempotência  |
| `refetchOnWindowFocus` / `refetchOnReconnect` | ativos                                                                | Voltar à aba ou à rede revalida o que está em tela                                               |
| Tempo limite por requisição                   | 15 s                                                                  | Vira `TimeoutError`; encadeado ao `signal` de cancelamento da query                              |

Exceções por recurso:

| Consulta                 | `staleTime`                              | Observação                                                                                 |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Sessão                   | 5 min                                    | O token é a fonte da verdade local; o usuário muda pouco                                   |
| Carrinho                 | 15 s                                     | Invalidado por mutations e por `nft.updated`                                               |
| Cotação                  | 0                                        | Só vale para o catálogo do instante em que foi calculada; refeita sempre que a tela abre   |
| Pedido                   | 0 enquanto `pending`; `Infinity` depois  | Estados terminais não mudam; pendente é consultado a cada 5 s se o socket estiver fora     |
| Lista de pedidos         | 0                                        | É a proteção contra um segundo pedido                                                      |
| Conexão da carteira      | 0                                        | Pode cair a qualquer momento                                                               |
| Transação simulada       | `Infinity`                               | Imutável                                                                                   |

**Chaves** (`src/lib/query-keys.ts`):

- públicas: `['nfts', 'list', <parâmetros normalizados>]`, `['nfts', 'detail', <id>]`;
- privadas: `['private', <escopo>, <recurso>, …]`.

**Isolamento por parâmetros e respostas fora de ordem.** A chave da listagem é o próprio
conjunto de parâmetros, normalizado (padrões removidos, listas ordenadas). Uma resposta só pode
cair na entrada da requisição que a gerou, então uma resposta antiga que chegue depois nunca
substitui o que o colecionador está vendo. Ao trocar de parâmetros, o `signal` do TanStack
Query cancela a requisição abandonada no Axios; enquanto a nova carrega, a página anterior fica
visível esmaecida (`keepPreviousData`) com o aviso "Atualizando…".

**Isolamento por usuário.** O escopo na chave impede que duas identidades compartilhem uma
entrada; o fim de uma sessão remove a subárvore inteira (seção 5).

**Estados de tela.** Cada consulta tem carregamento (skeleton), vazio, erro com "Tentar
novamente", sucesso e atualização em segundo plano (dado anterior mantido + indicador). Uma
falha ao atualizar dados já exibidos não os apaga: aparece um aviso com nova tentativa.

**Invalidação após mutations.**

| Mutation                        | Efeito no cache                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Carrinho (adicionar/alterar/…)  | A resposta substitui o carrinho; a cotação muda de chave (versão do carrinho) e é refeita              |
| Favoritar / desfavoritar        | Otimista; a resposta substitui a lista; em erro, rollback para o retrato anterior; depois, invalidação |
| Perfil / avatar                 | A resposta substitui o perfil e atualiza o usuário da sessão (nome e avatar do cabeçalho)              |
| Carteiras                       | A carteira devolvida é inserida/atualizada na lista; depois, invalidação                               |
| Login / cadastro                | Cache privado descartado; sessão gravada; carrinho da conta buscado                                    |
| Criar pedido                    | Pedido gravado; lista de pedidos, catálogo (estoque reservado) e carrinho invalidados                  |
| 409 `QUOTE_STALE`               | A cotação nova, que veio no erro, é adotada na hora; carrinho e catálogo invalidados                   |

**Atualização otimista com rollback:** favoritos (`useToggleFavorite`), quantidade e remoção de
itens do carrinho (`useUpdateCartItem`, `useRemoveCartItem`). O cenário `favorite-failure`
demonstra o rollback.

## 9. Reconciliação REST ↔ Socket.IO

`src/features/realtime/sync.ts` transforma cada evento aceito em escritas no cache:

- **patch** — os campos que o evento carrega são gravados na hora (preço e disponibilidade de
  um card, estado do pedido), sempre conferindo a versão da entrada;
- **invalidate** — o que o evento não descreve por inteiro é refeito por REST.

| Evento           | Patch imediato                                                              | Refeito por REST                                                                                         |
| ---------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `nft.updated`    | Detalhe do NFT (preço, edições, disponibilidade), cards das listas, favoritos | Listagens visíveis (um preço novo pode mudar ordem, filtros e contagens); carrinho e cotação, se o NFT estiver no carrinho |
| `order.updated`  | Pedido em cache (`status`, motivo, transação, datas)                        | Lista de pedidos; ao liquidar, carrinho e catálogo (itens removidos ou estoque devolvido)                |
| `wallet.updated` | Conexão da carteira                                                         | —                                                                                                        |

O carrinho é sempre refeito, nunca corrigido à mão: os valores são responsabilidade da API. O
colecionador é avisado comparando as linhas antes e depois ("O preço de X mudou de A para B",
"X esgotou", "Restam apenas N unidades"), por uma região viva (`aria-live`).

**Reconexão.** Eventos emitidos enquanto o socket esteve fora do ar não são reenviados (nem
pelo servidor simulado nem, em geral, por um servidor real sem _connection state recovery_).
Por isso, a cada reconexão, o cliente invalida o catálogo e toda a subárvore privada da
identidade atual: o que está em tela é refeito por REST; o resto fica marcado como obsoleto e é
refeito quando for usado.

**Cenário do enunciado** (NFT no carrinho muda de preço ou disponibilidade):

1. `nft.updated` chega → cards e detalhe são corrigidos na hora;
2. carrinho e cotação são refeitos → o resumo mostra os novos valores e um aviso descreve a
   mudança;
3. a mudança fica pendente de ciência → no checkout, "Confirmar e pagar" fica desabilitado até
   "Aceitar novos valores";
4. se, ainda assim, a compra for enviada com uma cotação antiga (o evento se perdeu), a API
   responde 409 `QUOTE_STALE` e o diálogo de revisão passa a mostrar a cotação nova.

**Queda de conexão com pedido pendente.** O pedido continua sendo consultado por REST a cada
5 s enquanto o socket não volta; ao reconectar, a reconciliação acima o atualiza. Como o pedido
já existe, nenhuma compra é reenviada — e, se fosse, a chave de idempotência e a regra de
pedido pendente devolveriam o mesmo pedido.

## 10. Camada de mocks (MSW)

A simulação fica inteira na camada de rede e é ativada por configuração
(`VITE_ENABLE_MOCKS=true`, valor do build de demonstração publicado).

```
handlers/ (REST, via `route()`)  ┐
                                 ├→ domain/ (regras) → db.ts (estado único) → localStorage
realtime/server.ts (Socket.IO) ◄─┘        │
        ▲                                 └→ realtime/bus.ts (eventos publicados pelo domínio)
        └────────────────────────────────────────┘
```

- **Um banco, dois transportes.** Catálogo, favoritos, carrinhos, perfil, carteiras e pedidos
  vivem em um único objeto de estado. `updateNft` é o único ponto de mudança do catálogo: ele
  incrementa a versão e publica `nft.updated`. Assim, toda mudança de dado aparece tanto na
  próxima resposta REST quanto no evento correspondente — inclusive as feitas pelo painel.
- **Persistência e reset.** O estado é espelhado em `localStorage` (`kurio.mock.db`, com versão
  de esquema) após cada mutation, o que sustenta refresh (sessões, carrinhos, pedidos
  pendentes; temporizadores de liquidação são retomados). `reset()` cancela temporizadores,
  encerra quedas simuladas, limpa o histórico de eventos, volta ao cenário padrão e restaura
  integralmente as fixtures.
- **Fixtures.** 54 NFTs (9 categorias, 3 redes, 4 tipos de edição, faixas de preço variadas —
  6 páginas de 9), 2 usuários, carteiras, favoritos, 4 cupons e um pedido confirmado do segundo
  usuário (para o recibo imutável e o 403).
- **Cenários.** Um cenário é um conjunto nomeado de ajustes (`src/mocks/config.ts`): latência
  fixa, variável (pseudoaleatória com semente fixa) ou decrescente (respostas fora de ordem);
  regras de falha por método/caminho (status HTTP, falha de conexão, timeout), com `skip` e
  `times`; e comportamentos de sessão, carteira, compra e tempo real. Não há `Math.random`:
  o mesmo cenário reproduz sempre o mesmo comportamento. Os 19 cenários e as formas de
  selecioná-los (painel, URL, console) estão no README.
- **Um só invólucro para os handlers.** `route()` aplica latência e falhas do cenário, resolve
  a sessão, valida o corpo com o esquema do contrato (422 com `fieldErrors`) e converte erros
  de domínio no envelope padrão. Os handlers descrevem apenas o caminho feliz.
- **Mesma camada em desenvolvimento, demonstração e testes.** Os testes Playwright rodam sobre
  o build otimizado com os mesmos handlers e controlam a simulação por `window.__kurioMocks`
  (cenário, relógio, preço, disponibilidade, liquidação, reentrega de eventos).

### Transporte Socket.IO na simulação e limitações

- **Transporte:** WebSocket, exclusivamente. O `socket.io-client` real da aplicação é
  configurado com `transports: ['websocket']`; o MSW intercepta o WebSocket na página
  (`ws.link`) e `@mswjs/socket.io-binding` codifica e decodifica os quadros Engine.IO/Socket.IO.
  Todo evento passa pelo _parser_, pelo _handshake_ e pela lógica de reconexão do próprio
  cliente — nada é entregue por _setters_, _callbacks_ ou escrita direta no cache.
- **Implementado à mão** sobre o _binding_ (`src/mocks/realtime/server.ts`): leitura do token no
  pacote CONNECT (`40{…}`), _heartbeat_ (ping a cada 20 s), roteamento de eventos privados ao
  dono, queda e recusa de conexão (um evento `error` seguido de fechamento anormal, para que o
  cliente entre em _backoff_ como faria com um servidor inacessível).
- **Não simulado:** _long-polling_ HTTP, _namespaces_ além de `/`, salas, _acks_ e
  _connection state recovery_. Eventos perdidos **não** são reenviados — o cliente reconcilia
  por REST ao reconectar, como teria de fazer em produção.
- **Ordem de carregamento.** O `engine.io-client` captura o `WebSocket` global quando seu
  módulo é avaliado. Por isso `socket.io-client` é importado sob demanda, só depois de o MSW
  instalar a interceptação (um `import type` garante que nada o avalie antes; a regra de lint
  `no-import-type-side-effects` protege isso).
- **Escopo da interceptação.** O MSW remove o prefixo `/socket.io/` antes de casar a URL, então
  o _link_ é a raiz da origem; outros WebSockets da mesma origem (HMR do Vite) são repassados
  ao servidor real.
- **Por aba.** A interceptação de WebSocket acontece na página, não no service worker: cada aba
  tem o seu servidor de eventos. O estado REST é compartilhado entre abas pelo `localStorage`,
  mas um evento disparado em uma aba não é entregue às outras.
- **HTTPS.** O service worker do MSW exige contexto seguro; o deploy usa HTTPS (localhost é
  aceito pelos navegadores).

## 11. Interface, responsividade e acessibilidade

- **Tokens.** Cores, escala tipográfica, raios e a coluna de 1200 px vêm do Figma e são
  definidos uma única vez em `src/styles/globals.css` (Tailwind v4 `@theme`). Os componentes
  shadcn/ui (`src/components/ui`) foram reescritos sobre esses tokens.
- **Breakpoints.** Shell mobile abaixo de 768 px (barra superior própria e barra de abas
  inferior); shell desktop a partir de 768 px; a barra lateral de filtros vira um painel
  deslizante abaixo de 1024 px. Larguras verificadas: 390, 768 e 1440 px.
- **Skeletons.** Catálogo, filtros, destaque, detalhe do NFT, carrinho, resumo de valores,
  pagamento, pedido, perfil, carteiras, favoritos e atividade têm skeletons com _shimmer_ nas
  dimensões do conteúdo final. `prefers-reduced-motion` desliga o _shimmer_ e as transições
  globalmente.
- **Teclado e foco.** Tudo é operável por teclado com anel de foco visível (`:focus-visible`
  global); link "Pular para o conteúdo"; diálogos e painéis (Radix) prendem o foco e o devolvem
  ao elemento que os abriu; a cada navegação o foco vai para o conteúdo e o título da página é
  anunciado.
- **Formulários.** Rótulos associados, `aria-invalid` + `aria-describedby` para erros, foco no
  primeiro campo inválido, erros da API junto aos campos.
- **Estados sem depender de cor.** Filtros selecionados, abas ativas, erros, esgotado e
  favoritos têm também ícone, texto, sublinhado ou forma.
- **Feedback acessível.** Mutations e mudanças em tempo real são anunciadas por regiões vivas
  (toasts `sonner` e `role="status"`/`role="alert"` nos blocos).
- **Imagens.** Artes com `alt` descritivo; decorativas com `alt=""`.
- **Zoom e overflow.** Nenhum overflow horizontal em 390/768/1440 px nem com 200% de zoom
  (verificado nos testes de acessibilidade).

## 12. Performance

- Um _chunk_ por rota; o backend simulado, o `socket.io-client` e o painel "Mocks" são
  carregados sob demanda, fora do caminho crítico. A primeira pintura não espera o service
  worker: as requisições aguardam o transporte ficar pronto.
- Artes em AVIF e WebP, em várias larguras (`srcset`/`sizes`), com dimensões declaradas;
  as que aparecem acima da dobra têm prioridade de carregamento e as demais são _lazy_.
- Fonte Roboto Mono variável, auto-hospedada, com _preload_ e `font-display: swap`.
- `<main>` ocupa ao menos a altura da janela a partir de 768 px e os skeletons reservam o
  espaço do conteúdo, para o CLS ficar próximo de zero.
- A auditoria (`lighthouse/`) mede início e detalhe em mobile e desktop, três vezes cada, e
  reporta a mediana; os resultados e as condições estão em `lighthouse/reports/SUMMARY.md`.

## 13. Testes

- **Playwright** (`e2e/`): Chromium, projetos `desktop` (1440×900) e `mobile` (390×844), sobre
  o build otimizado com os mocks. Cada teste começa em um contexto novo (sem service worker,
  cookies ou `localStorage` anteriores) e, quando o tempo importa, com relógio controlado.
  As verificações observam a interface e o resultado das operações: REST pelos handlers MSW e
  tempo real pelo `socket.io-client` real. Regressão visual de início, catálogo, detalhe,
  carrinho e pagamento com baselines versionadas. Relatório HTML e _traces_ das falhas.
  O mapa "requisito → arquivo de teste" está em [`e2e/README.md`](./e2e/README.md).
- **Vitest**: aritmética de ETH, guarda de eventos e utilitários determinísticos dos mocks.

## 14. Decisões de UX

- **Login e cadastro são rotas que se apresentam como diálogo** no desktop, sobre o catálogo
  (como no Figma), e como tela cheia no mobile. Por serem rotas, têm URL própria, funcionam com
  acesso direto e com o botão voltar. Fechar o diálogo volta ao catálogo e devolve o foco ao
  link "Entrar" do cabeçalho.
- **O carrinho funciona sem login**; a autenticação só é exigida ao seguir para o pagamento, e
  os itens do visitante são preservados.
- **Preço por edição.** Escolher a edição no detalhe troca preço, disponibilidade e limite por
  pedido; a edição escolhida vai para a URL (`?edicao=`), então o link compartilhado abre na
  mesma edição. Uma edição inexistente ou esgotada na URL é informada e substituída pela edição
  padrão.
- **Mudanças externas pedem ciência, mudanças próprias não.** Alterar quantidade ou cupom não
  gera aviso; preço, estoque, cupom expirado ou taxa alterados por fora geram, e travam a
  confirmação até serem aceitos.
- **Pedido pendente é um estado de primeira classe.** Há uma tela para ele, ele reaparece em
  "Atividade" e o checkout não deixa iniciar outra compra enquanto ele existir.
- **"Resultado desconhecido" é dito com todas as letras.** Quando o envio da compra fica sem
  resposta, a tela não diz que falhou nem que deu certo: explica que a confirmação não chegou e
  oferece verificar, o que recupera o mesmo pedido.
- **Ações fora do escopo não fingem sucesso.** Links de páginas editoriais, suporte, ofertas,
  downloads e redes sociais levam a `/em-breve/<seção>`, que explica que a área não faz parte da
  demonstração. Login social e newsletter informam que não estão disponíveis.
- **Painel "Mocks".** Ferramenta de operação da demonstração (não faz parte do Figma): escolhe
  cenários, restaura os dados e dispara eventos. Só existe em builds com mocks.

## 15. Desvios do Figma, assets e ajustes de acessibilidade

Ver a seção correspondente ao final da auditoria de fidelidade.

## 16. Limitações conhecidas

- **Backend simulado no navegador.** O estado dos mocks pertence ao navegador (`localStorage`):
  não é compartilhado entre dispositivos e limpar os dados do site equivale a um reset. Não há
  proteção real — o "token" é opaco apenas para a aplicação.
- **Tempo real por aba** (seção 10): eventos não atravessam abas; o estado REST, sim.
- **Sem blockchain, carteiras ou gateways reais**, conforme o escopo. Endereços, hashes, blocos
  e o explorador são fictícios.
- **Uma compra pendente por vez** por colecionador — regra deliberada da simulação, para que o
  carrinho possa manter os itens até a confirmação sem risco de compra em dobro.
- **Lista de pedidos sem paginação na UI**: a API pagina (20 por página) e a tela mostra a
  primeira página.
- **Avatar** é guardado como _data URL_ no estado simulado (limite de 2 MB por arquivo).
- **Navegadores.** Testes automatizados em Chromium (desktop e mobile emulado), como pede o
  enunciado. AVIF e `dvh` exigem navegadores atuais; há WebP como alternativa ao AVIF.
