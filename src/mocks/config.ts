import { type ApiErrorCode } from '@/contracts'
import { env } from '@/lib/env'
import { readJson, writeJson } from '@/lib/storage'

/**
 * Runtime configuration of the simulated backend. A *scenario* is a named preset of
 * this configuration; every knob is deterministic (no Math.random anywhere), so a
 * scenario always reproduces the same behaviour.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface LatencyConfig {
  /**
   * - `fixed`       every response takes `minMs`.
   * - `variable`    seeded pseudo-random latency between `minMs` and `maxMs`.
   * - `descending`  each request is answered faster than the previous one
   *                 (`maxMs` → `minMs`), so responses arrive out of order.
   */
  mode: 'fixed' | 'variable' | 'descending'
  minMs: number
  maxMs: number
}

export interface FailureRule {
  id: string
  method?: HttpMethod
  /** Path prefix relative to the API base ("/nfts"), or "*" for every request. */
  path: string
  /**
   * - `status`   answers with the HTTP error below.
   * - `network`  the connection fails: no response at all.
   * - `timeout`  the request is accepted but never answered.
   */
  kind: 'status' | 'network' | 'timeout'
  status?: number
  code?: ApiErrorCode
  message?: string
  /** Matching requests let through before the rule starts failing. */
  skip?: number
  /** Matching requests that fail before the rule turns itself off. Omit = always. */
  times?: number
}

export interface MockConfig {
  scenario: string
  latency: LatencyConfig
  failures: FailureRule[]
  /** `empty` answers the catalog with no items. */
  catalog: 'full' | 'empty'
  /** Lifetime of a session from the moment it is created. */
  sessionTtlMs: number
  /** `order` ends the session at the instant the purchase is submitted. */
  expireSessionOn: 'never' | 'order'
  /** How the wallet answers a connection request. */
  walletConnection: 'approve' | 'reject'
  /** Drops the wallet connection this long after it is established. */
  walletDisconnectAfterMs: number | null
  /** Catalog change injected when the purchase is submitted. */
  checkoutChange: 'none' | 'price' | 'sold-out'
  /** `timeout-once` creates the order but never answers the first request. */
  orderResponse: 'normal' | 'timeout-once'
  /** `manual` keeps orders pending until settled through the mock controls. */
  orderSettlement: 'confirm' | 'decline' | 'manual'
  orderSettleDelayMs: number
  /** Makes the realtime server unreachable for this long after an order is created. */
  socketOutageOnOrderMs: number | null
}

export const BASE_CONFIG: MockConfig = {
  scenario: 'default',
  latency: { mode: 'fixed', minMs: 120, maxMs: 120 },
  failures: [],
  catalog: 'full',
  sessionTtlMs: 30 * 60_000,
  expireSessionOn: 'never',
  walletConnection: 'approve',
  walletDisconnectAfterMs: null,
  checkoutChange: 'none',
  orderResponse: 'normal',
  orderSettlement: 'confirm',
  orderSettleDelayMs: 2_500,
  socketOutageOnOrderMs: null,
}

export interface Scenario {
  id: string
  label: string
  description: string
  group: 'Rede' | 'Catálogo' | 'Sessão' | 'Carteira' | 'Compra' | 'Tempo real'
  overrides: Partial<Omit<MockConfig, 'scenario'>>
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Tudo funciona: latência fixa de 120 ms e pagamento confirmado em 2,5 s.',
    group: 'Rede',
    overrides: {},
  },
  {
    id: 'slow-network',
    label: 'Rede lenta',
    description: 'Toda resposta demora 2,5 s. Exibe skeletons e estados de envio.',
    group: 'Rede',
    overrides: { latency: { mode: 'fixed', minMs: 2_500, maxMs: 2_500 } },
  },
  {
    id: 'variable-latency',
    label: 'Latência variável',
    description: 'Latência pseudoaleatória (semente fixa) entre 150 ms e 1,8 s.',
    group: 'Rede',
    overrides: { latency: { mode: 'variable', minMs: 150, maxMs: 1_800 } },
  },
  {
    id: 'out-of-order',
    label: 'Respostas fora de ordem',
    description:
      'Cada requisição responde mais rápido que a anterior (1,6 s → 100 ms): as respostas antigas chegam depois das novas.',
    group: 'Rede',
    overrides: { latency: { mode: 'descending', minMs: 100, maxMs: 1_600 } },
  },
  {
    id: 'offline',
    label: 'Sem conexão',
    description: 'Nenhuma requisição chega ao servidor (falha de rede).',
    group: 'Rede',
    overrides: { failures: [{ id: 'offline', path: '*', kind: 'network' }] },
  },
  {
    id: 'timeout',
    label: 'Timeout',
    description: 'O catálogo nunca responde: a requisição expira no cliente após 15 s.',
    group: 'Rede',
    overrides: {
      failures: [{ id: 'catalog-timeout', method: 'GET', path: '/nfts', kind: 'timeout' }],
    },
  },
  {
    id: 'empty-catalog',
    label: 'Catálogo vazio',
    description: 'A listagem responde com sucesso, mas sem nenhum NFT.',
    group: 'Catálogo',
    overrides: { catalog: 'empty' },
  },
  {
    id: 'server-error',
    label: 'Erro 500 no catálogo',
    description: 'A listagem e o detalhe respondem 500 em todas as tentativas.',
    group: 'Catálogo',
    overrides: {
      failures: [
        {
          id: 'catalog-500',
          method: 'GET',
          path: '/nfts',
          kind: 'status',
          status: 500,
          code: 'INTERNAL_ERROR',
        },
      ],
    },
  },
  {
    id: 'flaky-catalog',
    label: 'Catálogo instável (recupera)',
    description:
      'As duas primeiras consultas ao catálogo respondem 503; a terceira funciona. Exercita o "Tentar novamente".',
    group: 'Catálogo',
    overrides: {
      latency: { mode: 'fixed', minMs: 600, maxMs: 600 },
      failures: [
        {
          id: 'catalog-503',
          method: 'GET',
          path: '/nfts',
          kind: 'status',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          times: 2,
        },
      ],
    },
  },
  {
    id: 'favorite-failure',
    label: 'Falha ao favoritar',
    description:
      'A primeira alteração de favoritos responde 500: a interface desfaz a atualização otimista. A segunda funciona.',
    group: 'Catálogo',
    overrides: {
      latency: { mode: 'fixed', minMs: 500, maxMs: 500 },
      failures: [
        {
          id: 'favorite-put',
          method: 'PUT',
          path: '/favorites',
          kind: 'status',
          status: 500,
          code: 'INTERNAL_ERROR',
          times: 1,
        },
        {
          id: 'favorite-delete',
          method: 'DELETE',
          path: '/favorites',
          kind: 'status',
          status: 500,
          code: 'INTERNAL_ERROR',
          times: 1,
        },
      ],
    },
  },
  {
    id: 'session-expires-at-checkout',
    label: 'Sessão expira no checkout',
    description:
      'A sessão é encerrada no instante em que a compra é enviada (401). Após novo login o checkout é retomado.',
    group: 'Sessão',
    overrides: { expireSessionOn: 'order' },
  },
  {
    id: 'wallet-rejected',
    label: 'Conexão da carteira recusada',
    description: 'A carteira recusa o pedido de conexão (403).',
    group: 'Carteira',
    overrides: { walletConnection: 'reject' },
  },
  {
    id: 'wallet-disconnects',
    label: 'Carteira desconecta',
    description: 'A carteira conecta e cai 4 s depois; o checkout pede uma nova conexão.',
    group: 'Carteira',
    overrides: { walletDisconnectAfterMs: 4_000 },
  },
  {
    id: 'price-change-at-checkout',
    label: 'Preço muda ao confirmar',
    description:
      'Ao enviar a compra, o primeiro item do carrinho fica 0.1 ETH mais caro: a API recusa a cotação (409) e exige nova confirmação.',
    group: 'Compra',
    overrides: { checkoutChange: 'price' },
  },
  {
    id: 'sold-out-at-checkout',
    label: 'Edição esgota ao confirmar',
    description:
      'Ao enviar a compra, o primeiro item do carrinho esgota: a API recusa a cotação (409) e o item precisa ser removido.',
    group: 'Compra',
    overrides: { checkoutChange: 'sold-out' },
  },
  {
    id: 'order-timeout',
    label: 'Timeout após criar o pedido',
    description:
      'O pedido é criado, mas a primeira resposta nunca chega. A nova tentativa, com a mesma chave de idempotência, recupera o mesmo pedido.',
    group: 'Compra',
    overrides: { orderResponse: 'timeout-once' },
  },
  {
    id: 'payment-declined',
    label: 'Pagamento recusado',
    description: 'O pedido fica pendente por 2,5 s e é recusado. O carrinho é preservado.',
    group: 'Compra',
    overrides: { orderSettlement: 'decline' },
  },
  {
    id: 'payment-pending',
    label: 'Pagamento pendente (manual)',
    description: 'O pedido permanece pendente até ser confirmado ou recusado pelo painel de mocks.',
    group: 'Compra',
    overrides: { orderSettlement: 'manual' },
  },
  {
    id: 'socket-outage',
    label: 'Queda do tempo real com pedido pendente',
    description:
      'Ao criar o pedido, o Socket.IO fica inacessível por 6 s; o pedido é confirmado durante a queda e o estado é recuperado por REST ao reconectar.',
    group: 'Tempo real',
    overrides: { socketOutageOnOrderMs: 6_000, orderSettleDelayMs: 2_000 },
  },
]

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id)
}

export function configForScenario(id: string): MockConfig {
  const scenario = findScenario(id) ?? findScenario('default')
  return { ...BASE_CONFIG, ...scenario?.overrides, scenario: scenario?.id ?? 'default' }
}

/* -------------------------------------------------------------------------- */
/* Active configuration                                                       */
/* -------------------------------------------------------------------------- */

const CONFIG_KEY = 'kurio.mock.config'

let active: MockConfig = loadConfig()
/** How many requests each failure rule has seen; reset whenever the config changes. */
let ruleHits = new Map<string, number>()
/** Sequence of requests answered since the config was applied (drives latency). */
let requestSequence = 0
/** One-shot behaviours already consumed since the config was applied. */
let consumed = new Set<string>()

function loadConfig(): MockConfig {
  const stored = readJson<MockConfig>(CONFIG_KEY)
  if (stored && findScenario(stored.scenario)) return { ...BASE_CONFIG, ...stored }
  return configForScenario(env.defaultMockScenario)
}

export const mockConfig = {
  get(): MockConfig {
    return active
  },

  /** Replaces the whole configuration with a scenario preset. */
  applyScenario(id: string): MockConfig {
    active = configForScenario(id)
    this.resetCounters()
    writeJson(CONFIG_KEY, active)
    return active
  },

  /** Tweaks individual knobs on top of the active scenario. */
  update(patch: Partial<MockConfig>): MockConfig {
    active = { ...active, ...patch }
    this.resetCounters()
    writeJson(CONFIG_KEY, active)
    return active
  },

  resetCounters(): void {
    ruleHits = new Map()
    requestSequence = 0
    consumed = new Set()
  },

  /** True the first time it is asked about `key` after the config was applied. */
  once(key: string): boolean {
    if (consumed.has(key)) return false
    consumed.add(key)
    return true
  },

  nextSequence(): number {
    requestSequence += 1
    return requestSequence
  },

  /** Registers one more request against a rule and tells whether it must fail. */
  shouldFail(rule: FailureRule): boolean {
    const seen = ruleHits.get(rule.id) ?? 0
    ruleHits.set(rule.id, seen + 1)
    const skip = rule.skip ?? 0
    if (seen < skip) return false
    return rule.times === undefined || seen < skip + rule.times
  },
}
