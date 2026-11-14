# Kurio — Marketplace de NFTs

Solução do [Desafio Frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge):
um marketplace de NFTs com descoberta, compra e conta do colecionador, em desktop e mobile,
com APIs, autenticação, carteiras, pagamentos e tempo real **simulados na camada de rede**.

**Demo publicada:** https://gabrieldevprojetos.com.br

| Responsabilidade      | Tecnologia                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| Interface / linguagem | React 19 · TypeScript (strict)                                              |
| Roteamento            | TanStack Router (rotas por arquivo, busca na URL, guarda de rotas privadas) |
| Estado remoto         | TanStack Query                                                              |
| Cliente HTTP          | Axios (instância única em `src/lib/http`)                                   |
| Tempo real            | Socket.IO (`socket.io-client`)                                              |
| Estilo / componentes  | Tailwind CSS v4 · shadcn/ui (Radix) tematizado com os tokens do Figma       |
| Mocking               | MSW (REST) + `@mswjs/socket.io-binding` (Socket.IO)                         |
| Testes                | Playwright (E2E + regressão visual) · Vitest (unidades)                     |
| Auditoria             | Lighthouse (API Node, 3 medições por página/perfil)                         |
| Build                 | Vite 8                                                                      |

A arquitetura, os contratos, a política de cache/sessão e os desvios do Figma estão em
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Requisitos

- Node.js **22.19+** (testado com 24.x) e npm 10+
- Chrome/Chromium para o Playwright e o Lighthouse

Nenhum serviço externo é necessário: o backend é simulado no navegador.

## Setup

```bash
npm install
npx playwright install chromium   # só para rodar os testes E2E
npm run dev                       # http://localhost:5173 com os mocks ativos
```

## Comandos

| Comando                                   | O que faz                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Desenvolvimento com mocks (MSW + Socket.IO simulado)                                        |
| `npm run build`                           | Gera rotas, verifica tipos e cria o build otimizado de demonstração (com mocks)             |
| `npm run preview`                         | Serve o build em http://localhost:4173                                                      |
| `npm run build:backend`                   | Mesmo app **sem** a camada de mocks, apontando para uma API real (`.env.backend`)           |
| `npm run typecheck`                       | Verificação de tipos (`tsc -b`)                                                             |
| `npm run lint` · `npm run lint:fix`       | ESLint (inclui regras de acessibilidade e do TanStack Query)                                |
| `npm run format` · `npm run format:check` | Prettier                                                                                    |
| `npm test`                                | Testes de unidade (Vitest): aritmética de ETH, guarda de eventos, utilitários dos mocks     |
| `npm run e2e`                             | Playwright em Chromium, projetos `desktop` (1440) e `mobile` (390), sobre o build otimizado |
| `npm run e2e:ui` · `npm run e2e:report`   | Modo interativo · relatório HTML (traces das falhas incluídos)                              |
| `npm run e2e:update`                      | Regenera as baselines da regressão visual                                                   |
| `npm run lighthouse -- --build`           | Auditoria Lighthouse (início e detalhe, mobile e desktop, 3 medições, mediana)              |
| `npm run assets:images`                   | Regenera as variantes AVIF/WebP das artes a partir de `scripts/artwork-sources`             |
| `npm run deploy`                          | Publica o build na VPS (ver [Deploy](#deploy))                                              |

Detalhes dos testes em [`e2e/README.md`](./e2e/README.md) e da auditoria em
[`lighthouse/README.md`](./lighthouse/README.md).

## Variáveis de ambiente

Todas são públicas (prefixo `VITE_`) e têm valores padrão versionados em `.env.development`,
`.env.production` e `.env.backend`. Para sobrescrever localmente, crie `.env.local`
(modelo em `.env.example`).

| Variável             | Padrão    | Descrição                                                                              |
| -------------------- | --------- | -------------------------------------------------------------------------------------- |
| `VITE_API_URL`       | `/api`    | Base da API REST. Com mocks, o MSW intercepta esse caminho no navegador                |
| `VITE_SOCKET_URL`    | _(vazio)_ | Origem do servidor Socket.IO; vazio = mesma origem do app                              |
| `VITE_ENABLE_MOCKS`  | `true`    | `true` inicia a camada de mocks antes das requisições. O build publicado mantém `true` |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks                                                              |

## Credenciais fictícias

As fixtures guardam apenas o **hash com sal** (PBKDF2-SHA-256) das senhas — nunca o texto.

| Usuário    | E-mail             | Senha        | Estado inicial                                                  |
| ---------- | ------------------ | ------------ | --------------------------------------------------------------- |
| Ana Souza  | `ana@kurio.test`   | `Kurio@2026` | 2 carteiras (Principal/Ethereum, Reserva/Polygon), 2 favoritos  |
| Bruno Lima | `bruno@kurio.test` | `Colecao#77` | sem carteiras, 1 favorito, dono do pedido confirmado `ord_1000` |

Cupons: `KURIO10` (10%), `GENESIS` (0.05 ETH a partir de 1 ETH), `RELAMPAGO` (15%, expira 2 h
após o reset), `EXPIRADO` (expirado). Qualquer outro código é inválido.

Cadastro: qualquer e-mail/usuário novo funciona; `ana@kurio.test` e `ana.souza` geram conflito.

## Cenários dos mocks

O backend simulado é configurável e determinístico (nenhum `Math.random`). Há três formas de
escolher um cenário:

1. **Painel "Mocks"** — botão no canto inferior esquerdo (aba na borda direita em telas
   pequenas). Lista os cenários, aplica, reinicia os dados e dispara eventos (alterar preço,
   esgotar, derrubar o socket, confirmar/recusar pedido, expirar sessão, desconectar carteira).
2. **URL** — `/?scenario=<id>` aplica o cenário; `/?reset` restaura os dados iniciais;
   `/?scenario=<id>&reset` faz os dois (estado conhecido). Os parâmetros somem da URL depois.
3. **Console** — `window.__kurioMocks` (ex.: `__kurioMocks.setScenario('payment-declined')`,
   `__kurioMocks.reset()`, `__kurioMocks.setPrice('emerald-ape-042', '1.29')`).

O estado dos mocks (catálogo, sessões, carrinhos, pedidos, perfil, carteiras) persiste em
`localStorage` para sobreviver a refresh. **Reset:** `/?reset`, o botão "Restaurar dados
iniciais" do painel ou `__kurioMocks.reset()`.

| Cenário (`id`)                | Comportamento                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `default`                     | Tudo funciona: latência fixa de 120 ms, pagamento confirmado em 2,5 s                |
| `slow-network`                | Toda resposta demora 2,5 s (skeletons e estados de envio)                            |
| `variable-latency`            | Latência pseudoaleatória com semente fixa, 150 ms – 1,8 s                            |
| `out-of-order`                | Cada requisição responde mais rápido que a anterior: respostas antigas chegam depois |
| `offline`                     | Falha de conexão em toda requisição                                                  |
| `timeout`                     | O catálogo nunca responde; o cliente desiste após 15 s                               |
| `empty-catalog`               | Listagem com sucesso e zero itens                                                    |
| `server-error`                | Catálogo responde 500 sempre                                                         |
| `flaky-catalog`               | 503, 503 e depois sucesso                                                            |
| `favorite-failure`            | A primeira alteração de favoritos falha (rollback da atualização otimista)           |
| `session-expires-at-checkout` | A sessão é encerrada no instante do envio da compra                                  |
| `wallet-rejected`             | A carteira recusa a conexão                                                          |
| `wallet-disconnects`          | A carteira conecta e cai 4 s depois                                                  |
| `price-change-at-checkout`    | O preço do 1º item sobe 0.1 ETH no envio da compra                                   |
| `sold-out-at-checkout`        | O 1º item esgota no envio da compra                                                  |
| `order-timeout`               | O pedido é criado, mas a primeira resposta nunca chega                               |
| `payment-declined`            | O pedido fica pendente e é recusado                                                  |
| `payment-pending`             | O pedido fica pendente até ser confirmado/recusado pelo painel                       |
| `socket-outage`               | O Socket.IO fica inacessível por 6 s logo após criar o pedido                        |

## Como reproduzir os fluxos de falha

Em todos: use o painel "Mocks" ou abra a URL indicada. Para voltar ao normal, `/?reset`.

| Fluxo                            | Passos                                                                                            | Resultado esperado                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Skeletons e rede lenta           | `/?scenario=slow-network&reset` e navegue                                                         | Skeletons com shimmer no catálogo, detalhe e resumo; nenhum salto de layout                     |
| Catálogo vazio                   | `/?scenario=empty-catalog`                                                                        | "Nenhum NFT encontrado"                                                                         |
| Erro e recuperação               | `/?scenario=flaky-catalog`                                                                        | Estado de erro → "Tentar novamente" → catálogo carrega                                          |
| Sem conexão / timeout            | `/?scenario=offline` ou `timeout`                                                                 | Mensagem de falha com nova tentativa (timeout após 15 s)                                        |
| Respostas fora de ordem          | `/?scenario=out-of-order`, troque filtros rapidamente                                             | A grade termina no último filtro escolhido                                                      |
| Conflito de cadastro             | `/cadastro` com `ana@kurio.test`                                                                  | Erro da API no campo de e-mail                                                                  |
| Cupom inválido / expirado        | No carrinho, aplique `NADA` ou `EXPIRADO`                                                         | Mensagem associada ao campo                                                                     |
| Falha ao favoritar               | Entre como Ana, `/?scenario=favorite-failure`, clique no coração                                  | O coração muda, a API falha e ele volta, com aviso; a 2ª tentativa funciona                     |
| Sessão expirada                  | Logado, painel → "Expirar sessão" e navegue; ou `session-expires-at-checkout` e confirme a compra | Aviso, redirecionamento para `/entrar` e retorno ao ponto de origem com o formulário preservado |
| Acesso não autorizado            | Como Ana, abra `/pedido/ord_1000` (pedido do Bruno)                                               | "Este pedido pertence a outra conta"                                                            |
| Preço muda no carrinho/checkout  | Com item no carrinho, painel → "Aumentar preço em 0.1 ETH"                                        | Aviso em tempo real, resumo atualizado e confirmação bloqueada até aceitar os novos valores     |
| Cotação recusada pela API        | `price-change-at-checkout` ou `sold-out-at-checkout`, confirme a compra                           | 409: a revisão mostra a mudança (ou o item esgotado); nenhum pedido é criado                    |
| Clique repetido                  | Clique várias vezes em "Confirmar e pagar"                                                        | Um único pedido                                                                                 |
| Timeout após criar o pedido      | `order-timeout`, confirme e aguarde 15 s (ou recarregue)                                          | "Não recebemos a confirmação do envio" → "Verificar e concluir" recupera **o mesmo** pedido     |
| Pagamento recusado               | `payment-declined`, conclua a compra                                                              | Pendente → "Pagamento recusado"; carrinho preservado                                            |
| Pedido pendente + refresh        | `payment-pending`, conclua a compra, recarregue; depois painel → "Confirmar"                      | Continua pendente após o refresh; vira recibo ao confirmar                                      |
| Queda do socket                  | `socket-outage`, conclua a compra                                                                 | Aviso de conexão interrompida; o recibo aparece após reconectar, sem segundo pedido             |
| Carteira recusada / desconectada | `wallet-rejected` ou `wallet-disconnects`, abra a revisão                                         | Alerta com nova tentativa; confirmação bloqueada sem carteira conectada                         |

## Estrutura

```
src/
  app/            provedores, roteador, shell, efeitos globais (sessão, tempo real)
  routes/         rotas do TanStack Router (finas: params, busca na URL, guardas)
  features/       catalog · cart · checkout · orders · auth · account · realtime
    <feature>/    api.ts (Axios) · queries.ts (TanStack Query) · páginas · components/
  components/     ui/ (shadcn tematizado) · icons/ (extraídos do Figma) · layout/
  contracts/      esquemas zod + tipos compartilhados por app e mocks (REST e eventos)
  lib/            http (Axios), realtime (Socket.IO), money (ETH exato), sessão, utilitários
  mocks/          MSW: banco em memória, handlers, cenários, servidor Socket.IO, painel
e2e/              Playwright (specs, fixtures, baselines visuais)
lighthouse/       configuração, executor e relatórios da auditoria
deploy/           script de publicação e configuração do Caddy
scripts/          geração de imagens e hash das senhas das fixtures
```

## Deploy

A demo roda em uma VPS (Ubuntu + Caddy, HTTPS automático) em
**https://gabrieldevprojetos.com.br**. HTTPS é obrigatório porque a API simulada é um service
worker. O servidor entrega os arquivos estáticos com _fallback_ para `index.html`, então acesso
direto e refresh funcionam em qualquer rota.

```bash
bash deploy/deploy.sh setup      # uma vez por servidor: Caddy, pastas e configuração
npm run deploy                   # build + envio + troca atômica da release + verificação
bash deploy/deploy.sh rollback   # volta para a release anterior
```

Destino e domínio são configuráveis por variáveis (`DEPLOY_HOST`, `DEPLOY_DOMAIN`,
`DEPLOY_SSH_OPTS` — ver o cabeçalho de `deploy/deploy.sh`). O build é estático e também
funciona em Vercel, Netlify e Cloudflare Pages: `vercel.json` e `public/_redirects` já trazem
o _fallback_ de SPA.

## Auditoria Lighthouse

`npm run lighthouse -- --build` gera o build otimizado, sobe o preview, aquece o service
worker e mede **início** e **detalhe do NFT** em **mobile** e **desktop**, 3 vezes cada,
reportando a mediana por categoria e LCP/CLS/TBT. Relatórios HTML/JSON e o resumo ficam em
`lighthouse/reports/` (`SUMMARY.md` traz versões, ambiente e condições de execução).
