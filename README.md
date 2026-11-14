<div align="center">

<sub><b>K U R I O</b></sub>

# Marketplace de NFTs

**Descoberta, compra e conta do colecionador — em desktop e mobile, com APIs, autenticação,
carteiras, pagamentos e tempo real simulados na camada de rede.**

Solução do [Desafio Frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge),
fiel ao [layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

### [Abrir a demonstração](https://gabrieldevprojetos.com.br)

[Arquitetura](./ARCHITECTURE.md) · [Testes E2E](./e2e/README.md) · [Auditoria Lighthouse](./lighthouse/reports/SUMMARY.md)

![React 19](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack-Router%20%2B%20Query-ff4154)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)
![MSW](https://img.shields.io/badge/MSW-REST%20%2B%20Socket.IO-ff6a33)
![Playwright](https://img.shields.io/badge/Playwright-180%20testes-2ead33?logo=playwright&logoColor=white)
![Lighthouse](https://img.shields.io/badge/Lighthouse-98--100-f44b21?logo=lighthouse&logoColor=white)

<img src="docs/screenshots/desktop-home.webp" alt="Página inicial da Kurio no desktop: cabeçalho, destaque 'Seja dono do futuro da arte digital' e a arte do Emerald Ape" width="100%">

</div>

> [!TIP]
> **Avalie em 5 minutos** — tudo roda no navegador, não há backend para subir.
>
> 1. Abra [gabrieldevprojetos.com.br](https://gabrieldevprojetos.com.br) e compre um NFT: **Comprar → Conectar e finalizar →** entre como `ana@kurio.test` / `Kurio@2026` **→ Confirmar compra**.
> 2. Com o carrinho aberto, abra o painel **Mocks** (canto inferior esquerdo) e clique em **Aumentar preço em 0.1 ETH**: aviso em tempo real e confirmação bloqueada até aceitar os novos valores.
> 3. Troque o cenário para `order-timeout` e compre de novo: a tela recupera **o mesmo** pedido.
> 4. Abra `/?scenario=slow-network&reset` para ver os skeletons e `/?reset` para voltar ao estado inicial.
> 5. Localmente: `npm ci && npm run dev`, depois `npm run e2e` e `npm run lighthouse -- --build`.

## Em números

<table>
  <tr>
    <td width="33%"><h3>9 telas</h3>todas as do enunciado, com os frames desktop e mobile</td>
    <td width="33%"><h3>180 testes E2E</h3>Playwright, projetos desktop (1440) e mobile (390)</td>
    <td width="33%"><h3>98–100</h3>Lighthouse nas quatro categorias, mobile e desktop</td>
  </tr>
  <tr>
    <td><h3>19 cenários</h3>determinísticos de rede, sessão, carteira, compra e tempo real</td>
    <td><h3>32 endpoints</h3>REST com contratos zod compartilhados por app e mocks</td>
    <td><h3>0 dado fictício na UI</h3>tudo vem da API simulada; o mesmo código fala com um backend real</td>
  </tr>
</table>

## Sumário

| Parte                                | Seções                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[1 · Conhecer](#1--conhecer)**     | [Telas](#telas) · [Stack e como cada tecnologia é usada](#stack-e-como-cada-tecnologia-é-usada)                                                                                                                                 |
| **[2 · Avaliar](#2--avaliar)**       | [O enunciado, item por item](#o-enunciado-item-por-item) · [Como reproduzir os fluxos de falha](#como-reproduzir-os-fluxos-de-falha)                                                                                            |
| **[3 · Rodar](#3--rodar)**           | [Como rodar](#como-rodar) · [Variáveis de ambiente](#variáveis-de-ambiente) · [Credenciais fictícias e cupons](#credenciais-fictícias-e-cupons) · [Cenários dos mocks: seleção e reset](#cenários-dos-mocks-seleção-e-reset)    |
| **[4 · Por dentro](#4--por-dentro)** | [Arquitetura](#arquitetura-em-resumo) · [Tempo real](#tempo-real) · [Testes](#testes) · [Performance e Lighthouse](#performance-e-lighthouse) · [Acessibilidade](#acessibilidade) · [Fidelidade ao Figma](#fidelidade-ao-figma) |
| **[5 · Entrega](#5--entrega)**       | [Estrutura do projeto](#estrutura-do-projeto) · [Deploy](#deploy) · [Limitações conhecidas](#limitações-conhecidas)                                                                                                             |

---

## 1 · Conhecer

### Telas

As nove telas do enunciado, nos frames desktop e mobile do Figma.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/desktop-catalog.webp" alt="Catálogo com filtros de coleções, faixa de preço e rede, abas e grade de NFTs"><br><b>Início e catálogo</b> — busca, filtros combináveis, abas, ordenação e paginação na URL</td>
    <td width="50%"><img src="docs/screenshots/desktop-detail.webp" alt="Detalhe do Emerald Ape #042 com galeria, edições, quantidade, comprar e favoritar"><br><b>Detalhe do NFT</b> — galeria com zoom, edição na URL, limite de quantidade, favoritos</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/desktop-cart.webp" alt="Carrinho com três NFTs, quantidades, cupom e resumo de valores"><br><b>Carrinho</b> — quantidades por edição, cupom e resumo calculado pela API</td>
    <td><img src="docs/screenshots/desktop-payment.webp" alt="Pagamento com dados do colecionador, carteiras cadastradas e provedores"><br><b>Pagamento</b> — dados do colecionador, carteira e rede</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/desktop-review.webp" alt="Diálogo de revisão do pedido com carteira conectada, itens e total"><br><b>Revisão</b> — cotação revalidada e carteira conectada antes de pagar</td>
    <td><img src="docs/screenshots/desktop-receipt.webp" alt="Recibo do pedido confirmado com ID da transação, data, total, carteira e itens"><br><b>Confirmação</b> — recibo com o retrato imutável do pedido</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/desktop-login.webp" alt="Diálogo de login sobre o catálogo"><br><b>Login e cadastro</b> — diálogos com rota própria e retorno ao fluxo</td>
    <td><img src="docs/screenshots/desktop-profile.webp" alt="Perfil do colecionador com dados, avatar e alteração de senha"><br><b>Perfil e carteiras</b> — dados, avatar, senha, carteiras principal e secundária</td>
  </tr>
</table>

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/mobile-home.webp" alt="Início no mobile" width="150"><br><sub>Início</sub></td>
    <td align="center"><img src="docs/screenshots/mobile-detail.webp" alt="Detalhe do NFT no mobile" width="150"><br><sub>Detalhe</sub></td>
    <td align="center"><img src="docs/screenshots/mobile-cart.webp" alt="Carrinho no mobile" width="150"><br><sub>Carrinho</sub></td>
    <td align="center"><img src="docs/screenshots/mobile-login.webp" alt="Login no mobile" width="150"><br><sub>Login</sub></td>
    <td align="center"><img src="docs/screenshots/mobile-payment.webp" alt="Pagamento no mobile" width="150"><br><sub>Pagamento</sub></td>
    <td align="center"><img src="docs/screenshots/mobile-receipt.webp" alt="Recibo no mobile" width="150"><br><sub>Confirmação</sub></td>
  </tr>
</table>

Perfil, carteiras, favoritos, atividade e confirmação também funcionam no mobile, mesmo sem frame
específico. Todas as telas foram verificadas de 320 a 1920 px de largura, sem overflow horizontal.

### Stack e como cada tecnologia é usada

O enunciado pede que cada tecnologia participe efetivamente da solução. Onde cada uma entra:

| Responsabilidade      | Tecnologia                       | Onde participa                                                                                                 |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Interface / linguagem | React 19 · TypeScript strict     | Toda a aplicação; contratos tipados com zod, compartilhados por app e mocks                                    |
| Roteamento            | TanStack Router                  | Rotas por arquivo, busca/filtros/edição validados na URL, guarda das rotas privadas, 404, um _chunk_ por rota  |
| Estado remoto         | TanStack Query                   | Consultas, mutations, cache por usuário, atualização otimista com rollback, sincronização com eventos          |
| Cliente HTTP · REST   | Axios                            | Instância única: token, carrinho do visitante, tempo limite, erros tipados, expiração de sessão — 32 endpoints |
| Tempo real            | Socket.IO (`socket.io-client`)   | `nft.updated`, `order.updated`, `wallet.updated` com identidade, recurso e versão                              |
| Estilo                | Tailwind CSS v4                  | Tokens do Figma (cores, tipografia, raios) definidos uma vez em `globals.css`                                  |
| Componentes           | shadcn/ui (Radix)                | Diálogos, painéis, selects, radios, abas, menus — reescritos com os tokens da Kurio                            |
| Mocking               | MSW + `@mswjs/socket.io-binding` | REST via service worker e Socket.IO via WebSocket interceptado, com estado único e cenários                    |
| Testes E2E / visuais  | Playwright                       | 91 testes × 2 projetos, regressão visual com baselines versionadas                                             |
| Auditoria             | Lighthouse                       | Runner próprio: 3 medições por página e perfil, mediana, relatórios HTML/JSON                                  |

---

## 2 · Avaliar

### O enunciado, item por item

Cada seção do [enunciado](https://github.com/junglegaming/frontend-challenge), como foi atendida e
onde conferir. Os detalhes técnicos estão em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

| §   | Requisito                  | Situação    | Como foi atendido · onde conferir                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Escopo                     | ✅ Atendido | Descoberta, compra e conta em desktop e mobile, com dados simulados. Páginas editoriais, suporte, ofertas e downloads levam a uma página "em breve" que diz isso — nada aparenta sucesso falso                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2   | Stack obrigatória          | ✅ Atendido | As 12 tecnologias participam efetivamente ([tabela acima](#stack-e-como-cada-tecnologia-é-usada))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 3   | Telas e fluxos             | ✅ Atendido | As 9 telas. **Catálogo:** busca, filtros, ordenação e página na URL, com refresh e histórico; filtro zera a página; vazio, falha e respostas fora de ordem. **Detalhe:** acesso direto, NFT inexistente, edição indisponível, limite de quantidade, favoritos. **Carrinho:** por edição, preservado no refresh e no login, cupom, valores da API, mudanças em tempo real. **Pagamento:** validação, revisão, carteiras com conexão/recusa/desconexão, revalidação, pedido único, pendente/confirmado/recusado, recibo imutável. **Conta:** cadastro, login, logout, sessão recuperável, expiração com retomada |
| 4   | Integração e estado        | ✅ Atendido | Router, Query e Axios; cache isolado por usuário e por parâmetros; respostas obsoletas canceladas; invalidação após mutations e eventos; atualização otimista com rollback; política de cache e retry em [`ARCHITECTURE.md` §8](./ARCHITECTURE.md#8-cache-retries-e-sincronização)                                                                                                                                                                                                                                                                                                                             |
| 5   | Contratos REST             | ✅ Atendido | 32 endpoints com esquemas zod; erros de validação, sessão, permissão, inexistente, conflito e falha transitória; pedido idempotente com `Idempotency-Key` ([`ARCHITECTURE.md` §3](./ARCHITECTURE.md#3-contratos-rest))                                                                                                                                                                                                                                                                                                                                                                                         |
| 6   | Mocking com MSW            | ✅ Atendido | Mocks só na camada de rede; estado único; persistência e reset; 19 cenários; 54 NFTs e 2 usuários; Socket.IO via `@mswjs/socket.io-binding`; ativado por configuração e presente no build publicado                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7   | Tempo real                 | ✅ Atendido | Eventos com identidade, recurso e versão; duplicatas e eventos antigos descartados; reconciliação por REST na reconexão; isolamento entre sessões; listeners liberados; queda de conexão com pedido pendente                                                                                                                                                                                                                                                                                                                                                                                                   |
| 8   | Interface e acessibilidade | ✅ Atendido | Fidelidade medida contra o Figma; 390/768/1440 e outras larguras; skeletons com shimmer; movimento reduzido; teclado, foco, semântica, textos alternativos, contraste, feedback acessível, zoom de 200%                                                                                                                                                                                                                                                                                                                                                                                                        |
| 9   | Testes com Playwright      | ✅ Atendido | Os 12 cenários exigidos em desktop e mobile, mais regressão visual; estado isolado, relógio e eventos controlados, relatório HTML e traces ([mapa](#testes))                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 10  | Performance e Lighthouse   | ✅ Atendido | Início e detalhe, mobile e desktop, build otimizado, 3 medições, mediana; LCP, CLS e TBT; configuração e relatórios versionados ([resultados](#performance-e-lighthouse))                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 11  | Critérios de avaliação     | ✅ Atendido | Não exige entrega própria; esta tabela, os testes, a auditoria e o [`ARCHITECTURE.md`](./ARCHITECTURE.md) são a evidência de cada critério                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 12  | Entrega                    | ✅ Atendido | Código, lockfile, assets, mocks, fixtures, testes e auditoria versionados; deploy público com acesso direto e refresh; este README e o `ARCHITECTURE.md`; execução a partir de checkout limpo                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Como reproduzir os fluxos de falha

Use o painel "Mocks" ou abra a URL indicada. Para voltar ao normal, `/?reset`.

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

---

## 3 · Rodar

### Como rodar

**Requisitos:** Node.js **22.19+** (testado com 24) e npm 10+. Nenhum serviço externo — o backend
é simulado no navegador.

```bash
npm ci                              # instala exatamente o lockfile
npm run dev                         # http://localhost:5173 com os mocks ativos
npx playwright install chromium     # uma vez, para os testes E2E
```

<details>
<summary><b>Todos os comandos</b></summary>

| Comando                                   | O que faz                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`                             | Desenvolvimento com mocks (MSW + Socket.IO simulado)                                   |
| `npm run build`                           | Gera as rotas, verifica os tipos e cria o build otimizado de demonstração (com mocks)  |
| `npm run preview`                         | Serve o build em http://localhost:4173                                                 |
| `npm run build:backend`                   | Mesmo app **sem** a camada de mocks, apontando para uma API real (`.env.backend`)      |
| `npm run typecheck`                       | Verificação de tipos (`tsc -b`)                                                        |
| `npm run lint` · `npm run lint:fix`       | ESLint (inclui regras de acessibilidade, TanStack Query e proibição de `fetch` no app) |
| `npm run format` · `npm run format:check` | Prettier                                                                               |
| `npm test`                                | Testes unitários (Vitest)                                                              |
| `npm run e2e`                             | Playwright, projetos `desktop` e `mobile`, sobre o build otimizado                     |
| `npm run e2e:ui` · `npm run e2e:report`   | Modo interativo · relatório HTML (com traces das falhas)                               |
| `npm run e2e:update`                      | Regenera as baselines da regressão visual                                              |
| `npm run lighthouse -- --build`           | Auditoria Lighthouse: início e detalhe, mobile e desktop, 3 medições, mediana          |
| `npm run assets:images`                   | Regenera as variantes AVIF/WebP das artes                                              |
| `npm run deploy` · `npm run deploy:check` | Publica o build na VPS · verifica o site publicado                                     |

</details>

A entrega foi verificada a partir de um **checkout limpo** (`git clone` + `npm ci`): typecheck, lint,
testes unitários, build, formatação e a suíte E2E completa passam.

### Variáveis de ambiente

Todas são públicas (prefixo `VITE_`) e têm valores padrão versionados em `.env.development`,
`.env.production` e `.env.backend`. Para sobrescrever localmente, crie `.env.local` a partir de
`.env.example`.

| Variável             | Padrão    | Descrição                                                                              |
| -------------------- | --------- | -------------------------------------------------------------------------------------- |
| `VITE_API_URL`       | `/api`    | Base da API REST. Com mocks, o MSW intercepta esse caminho no navegador                |
| `VITE_SOCKET_URL`    | _(vazio)_ | Origem do servidor Socket.IO; vazio = mesma origem do app                              |
| `VITE_ENABLE_MOCKS`  | `true`    | `true` inicia a camada de mocks antes das requisições. O build publicado mantém `true` |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks                                                              |

### Credenciais fictícias e cupons

As fixtures guardam apenas o **hash com sal** (PBKDF2-SHA-256) das senhas — nunca o texto.

| Usuário    | E-mail             | Senha        | Estado inicial                                                  |
| ---------- | ------------------ | ------------ | --------------------------------------------------------------- |
| Ana Souza  | `ana@kurio.test`   | `Kurio@2026` | 2 carteiras (Principal/Ethereum, Reserva/Polygon), 2 favoritos  |
| Bruno Lima | `bruno@kurio.test` | `Colecao#77` | sem carteiras, 1 favorito, dono do pedido confirmado `ord_1000` |

| Cupom       | Efeito                                            |
| ----------- | ------------------------------------------------- |
| `KURIO10`   | 10% de desconto                                   |
| `GENESIS`   | 0.05 ETH de desconto em compras a partir de 1 ETH |
| `RELAMPAGO` | 15%, expira 2 h depois do reset                   |
| `EXPIRADO`  | sempre expirado                                   |

Qualquer outro código é inválido. No cadastro, qualquer e-mail/usuário novo funciona;
`ana@kurio.test` e `ana.souza` geram conflito.

### Cenários dos mocks: seleção e reset

O backend simulado é configurável e **determinístico** (nenhum `Math.random`): o mesmo cenário
reproduz sempre o mesmo comportamento.

<img src="docs/screenshots/desktop-mocks.webp" alt="Painel Mocks aberto sobre a página inicial, com seleção de cenário e controles de tempo real" width="100%">

| Forma            | Como usar                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Painel Mocks** | Botão no canto inferior esquerdo (no mobile, uma aba estreita na borda direita). Aplica cenários, restaura os dados e dispara eventos: preço, estoque, socket, pedido, sessão, carteira |
| **URL**          | `/?scenario=<id>` aplica o cenário; `/?reset` restaura os dados iniciais; `/?scenario=<id>&reset` faz os dois. Os parâmetros somem da URL em seguida                                    |
| **Console**      | `window.__kurioMocks` — por exemplo `setScenario('payment-declined')`, `reset()` ou `setPrice('emerald-ape-042', '1.29')`                                                               |

O estado dos mocks (catálogo, sessões, carrinhos, pedidos, perfil, carteiras) persiste em
`localStorage` para sobreviver a refresh. **Reset** (`/?reset`, botão "Restaurar dados iniciais" do
painel ou `__kurioMocks.reset()`) volta integralmente a um estado conhecido.

<details>
<summary><b>Os 19 cenários</b></summary>

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

</details>

---

## 4 · Por dentro

### Arquitetura em resumo

```
┌────────────────────────────── navegador ───────────────────────────────┐
│ UI           routes/ (params, busca, guardas) → features/*/página       │
│              components/ (apresentação, só props)                       │
│                        ▲ hooks de feature (queries.ts)                  │
│ Estado       TanStack Query — cache por identidade  ◄─ realtime/sync.ts │
│                        ▲                                   ▲            │
│ Transporte   Axios (lib/http)                     socket.io-client       │
├────────────────────────┼───────────────────────────────────┼────────────┤
│ Mocks (MSW)  service worker → handlers → domínio → banco em memória      │
│              banco → barramento de eventos → servidor Socket.IO          │
└──────────────────────────────────────────────────────────────────────────┘
```

| Princípio                        | Na prática                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Um contrato, dois lados**      | `src/contracts` define com zod todos os recursos REST e eventos; aplicação e mocks importam os mesmos esquemas            |
| **Nenhum dado fictício na UI**   | Com `VITE_ENABLE_MOCKS=false` o mesmo código fala com um backend real, e o código dos mocks nem é baixado                 |
| **Eventos só pelo cache**        | `socket.io-client → guarda de eventos → cache do TanStack Query → UI`, o mesmo caminho de uma resposta REST               |
| **Dinheiro é string**            | ETH trafega como string decimal; as contas usam `BigInt` em wei                                                           |
| **Cache por usuário**            | Chaves `['private', escopo, …]`: logout e troca de usuário removem tudo da sessão anterior                                |
| **Pedido único em três camadas** | Trava síncrona na página, `Idempotency-Key` persistida até uma resposta definitiva e recusa de um segundo pedido pendente |

Contratos REST, eventos, sessão, carrinho, cache, reconciliação, transporte dos mocks, decisões de UX
e desvios do Figma: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

### Tempo real

| Evento           | Efeito                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `nft.updated`    | Preço e disponibilidade atualizados no catálogo, no detalhe, nos favoritos e no carrinho, com aviso   |
| `order.updated`  | Estado do pedido atualizado; recibo ao confirmar, recusa com motivo; carrinho e estoque reconciliados |
| `wallet.updated` | Carteira desconectada bloqueia a confirmação até reconectar                                           |

O cenário do enunciado funciona de ponta a ponta: com um NFT no carrinho, o preço muda, a interface
avisa e atualiza o resumo, e o checkout bloqueia a confirmação até o colecionador aceitar os novos
valores. Se a cotação antiga chegar à API mesmo assim, ela responde 409 com a cotação nova. Uma queda
de conexão com pedido pendente é recuperada por REST, sem criar outra compra. Duplicatas e eventos
antigos são descartados por id e versão, e eventos de outra sessão nunca chegam à tela. O transporte
simulado e suas limitações estão em
[`ARCHITECTURE.md`](./ARCHITECTURE.md#transporte-socketio-na-simulação-e-limitações).

### Testes

**Playwright** — 91 testes em 13 arquivos, nos projetos `desktop` (1440×900) e `mobile` (390×844):
**180 execuções passam**; 2 são puladas por desenho (um teste só de mobile e uma verificação só de
desktop). Cada teste começa em um contexto limpo; REST passa pelos handlers MSW e tempo real pelo
`socket.io-client` real; relógio, latência e eventos são controlados nos cenários sensíveis a tempo.

| Requisito do enunciado (§9)                                  | Arquivo                    |
| ------------------------------------------------------------ | -------------------------- |
| 1. Busca, filtros, ordenação, paginação e histórico          | `catalog.spec.ts`          |
| 2. Acesso direto ao detalhe e recurso inexistente            | `nft-detail.spec.ts`       |
| 3. Cadastro, login, expiração, logout e troca de usuário     | `auth.spec.ts`             |
| 4. Favoritos com falha de mutation e recuperação             | `favorites.spec.ts`        |
| 5. Carrinho, quantidades, remoção, cupom e persistência      | `cart.spec.ts`             |
| 6. Compra completa, do catálogo ao recibo                    | `purchase.spec.ts`         |
| 7. Pagamento recusado, clique repetido e timeout             | `payment-failures.spec.ts` |
| 8. Perfil, avatar, senha e carteiras com validação           | `account.spec.ts`          |
| 9. Preço/disponibilidade via Socket.IO no checkout           | `realtime.spec.ts`         |
| 10. Eventos duplicados/antigos, desconexão e pedido pendente | `realtime.spec.ts`         |
| 11. Teclado, foco de diálogos e validação                    | `a11y.spec.ts`             |
| 12. Skeletons, falha e nova tentativa                        | `resilience.spec.ts`       |
| Regressão visual (início, detalhe, carrinho, pagamento)      | `visual.spec.ts`           |
| Camada de mocks (contratos, idempotência, reset, eventos)    | `mock-layer.spec.ts`       |

```bash
npm run e2e                  # tudo, desktop + mobile
npm run e2e:report           # relatório HTML; falhas guardam trace, vídeo e screenshot
```

**Vitest** — 40 testes de unidade: aritmética exata de ETH, guarda de eventos (duplicatas, versões
antigas), utilitários determinísticos dos mocks e paginação do carrossel.

### Performance e Lighthouse

`npm run lighthouse -- --build` gera o build otimizado, sobe o preview, aquece o service worker e mede
cada página 3 vezes por perfil. Mediana de cada categoria:

| Perfil  | Página         | Performance | Accessibility | Best Practices |   SEO   | LCP    | CLS    | TBT    |
| ------- | -------------- | :---------: | :-----------: | :------------: | :-----: | ------ | ------ | ------ |
| mobile  | Início         |   **98**    |    **100**    |    **100**     | **100** | 1,89 s | 0,0006 | 135 ms |
| mobile  | Detalhe do NFT |   **98**    |    **100**    |    **100**     | **100** | 1,73 s | 0      | 156 ms |
| desktop | Início         |   **100**   |    **100**    |    **100**     | **100** | 0,54 s | 0,0017 | 0 ms   |
| desktop | Detalhe do NFT |   **100**   |    **100**    |    **100**     | **100** | 0,52 s | 0,0001 | 0 ms   |

Metas do enunciado: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 — todas
atingidas, sem simplificações exclusivas para a auditoria (imagens, fontes, mocks e tempo real carregam
normalmente). Relatórios HTML/JSON por medição, versões das ferramentas, ambiente e condições em
[`lighthouse/reports/SUMMARY.md`](./lighthouse/reports/SUMMARY.md). O que mais pesa: um _chunk_ por
rota; mocks, `socket.io-client` e o painel carregados sob demanda; artes em AVIF/WebP responsivas;
fonte auto-hospedada; skeletons que reservam o espaço do conteúdo (CLS ≈ 0).

### Acessibilidade

- Tudo operável por teclado, com anel de foco visível e link "Pular para o conteúdo".
- Diálogos e painéis prendem o foco e o devolvem ao elemento que os abriu — inclusive o login, que é
  uma rota.
- Rótulos associados, erros ligados por `aria-describedby`, foco no primeiro campo inválido.
- Estados que não dependem só de cor (filtros, abas, edição selecionada, esgotado).
- Mutations e mudanças em tempo real anunciadas por regiões vivas.
- `prefers-reduced-motion` respeitado em todo o app; zoom de 200% sem perda de conteúdo.
- Varreduras axe (WCAG 2.1 A/AA) em 9 telas dentro da suíte E2E; Lighthouse Accessibility 100.

### Fidelidade ao Figma

Cada frame do Figma (9 desktop, 6 mobile) foi exportado com a geometria de todas as camadas e
**comparado numericamente** com a aplicação em execução: linha de base, tamanho, peso e cor de cada
texto; posição, tamanho e raio de cada retângulo e ícone. No desktop, a grande maioria das camadas
fica a menos de 1,5 px, e as alturas de página batem com as dos frames. O que sobra é intencional —
ajustes de acessibilidade (como áreas de toque de 24 px nos pontos dos carrosséis), estados que o
Figma não desenha ou inconsistências do próprio arquivo — e está listado em
[`ARCHITECTURE.md` › Desvios do Figma](./ARCHITECTURE.md#15-desvios-do-figma-assets-e-ajustes-de-acessibilidade).
As quatro artes originais são usadas sem substituição.

---

## 5 · Entrega

### Estrutura do projeto

```
src/
  app/            provedores, roteador, shell, efeitos globais (sessão, tempo real)
  routes/         rotas do TanStack Router (finas: params, busca na URL, guardas)
  features/       catalog · cart · checkout · orders · auth · account · realtime
    <feature>/    api.ts (Axios) · queries.ts (TanStack Query) · páginas · components/
  components/     ui/ (shadcn tematizado) · icons/ (extraídos do Figma) · layout/
  contracts/      esquemas zod + tipos compartilhados por app e mocks (REST e eventos)
  lib/            http (Axios), realtime (Socket.IO), money (ETH exato), sessão, utilitários
  mocks/          MSW: banco em memória, domínio, handlers, cenários, Socket.IO, painel
e2e/              Playwright: specs, fixtures, baselines visuais
lighthouse/       configuração, runner e relatórios da auditoria
deploy/           script de publicação e configuração do Caddy
docs/screenshots/ imagens deste README
scripts/          geração das imagens e do hash das senhas das fixtures
```

### Deploy

A demonstração roda em **https://gabrieldevprojetos.com.br** — uma VPS Ubuntu com Caddy e HTTPS
automático (o service worker do MSW exige contexto seguro). O servidor entrega os arquivos estáticos
com _fallback_ para `index.html`, então acesso direto e refresh funcionam em qualquer rota. A versão
publicada corresponde ao código deste repositório; `/version.txt` mostra a release em execução.

```bash
bash deploy/deploy.sh setup      # uma vez por servidor: Caddy, pastas e configuração
npm run deploy                   # build + envio + troca atômica da release + verificação
bash deploy/deploy.sh rollback   # volta para a release anterior
```

O endereço do servidor não fica no repositório: `DEPLOY_HOST=usuario@host` vai em `deploy/deploy.env`
(ignorado pelo git) ou numa variável de ambiente; `DEPLOY_DOMAIN` e `DEPLOY_SSH_OPTS` completam a
configuração (ver o cabeçalho de `deploy/deploy.sh`). O build é estático e também funciona em Vercel,
Netlify e Cloudflare Pages: `vercel.json` e `public/_redirects` já trazem o _fallback_ de SPA.

### Limitações conhecidas

- O backend simulado vive no navegador: os dados não são compartilhados entre dispositivos, e limpar
  os dados do site equivale a um reset.
- A simulação de Socket.IO acontece por aba: eventos não atravessam abas (o estado REST, sim).
- Sem blockchain, carteiras ou gateways reais, conforme o escopo — endereços, hashes e o explorador
  são fictícios.
- Uma compra pendente por vez por colecionador, de propósito: o carrinho mantém os itens até a
  confirmação sem risco de compra em dobro.

A lista completa, com os motivos, está em [`ARCHITECTURE.md`](./ARCHITECTURE.md#16-limitações-conhecidas).
