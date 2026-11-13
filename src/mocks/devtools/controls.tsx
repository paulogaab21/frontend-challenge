import { Check, Copy, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'

import type { EditionId } from '@/contracts'
import { addEth } from '@/lib/money'
import type { MockControl } from '@/mocks/control'

import { demoAccounts } from './accounts'
import { buttonClass, inputClass } from './styles'
import { Section } from './section'

function readView(control: MockControl) {
  return {
    config: control.config(),
    scenarios: control.scenarios(),
    snapshot: control.snapshot(),
    pending: control.pendingOrders(),
    events: control.events().slice(-10).reverse(),
    sockets: control.connectedSockets(),
  }
}

export function Controls({
  control,
  onScenarioChange,
}: {
  control: MockControl
  onScenarioChange: (label: string) => void
}) {
  const [view, setView] = useState(() => readView(control))
  const [scenario, setScenario] = useState(view.config.scenario)
  const [nftId, setNftId] = useState(
    () =>
      Object.values(view.snapshot.carts).flatMap((cart) => cart.lines)[0]?.nftId ??
      view.snapshot.nftOrder[0] ??
      '',
  )
  const [editionId, setEditionId] = useState<EditionId | null>(null)
  const [stock, setStock] = useState(10)
  const [status, setStatus] = useState('Controles prontos.')
  const ids = useId()
  const refresh = useCallback(() => {
    setView(readView(control))
  }, [control])

  useEffect(() => {
    const timer = window.setInterval(refresh, 1000)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    onScenarioChange(
      view.scenarios.find((entry) => entry.id === view.config.scenario)?.label ??
        view.config.scenario,
    )
  }, [onScenarioChange, view.config.scenario, view.scenarios])

  const act = async (success: string, operation: () => unknown) => {
    try {
      await operation()
      refresh()
      setStatus(success)
    } catch (error) {
      setStatus(
        `Não foi possível concluir: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const nft = view.snapshot.nfts[nftId] ?? view.snapshot.nfts[view.snapshot.nftOrder[0] ?? '']
  const edition =
    nft?.editions.find((entry) => entry.id === (editionId ?? nft.defaultEditionId)) ??
    nft?.editions[0]
  const cartIds = new Set(
    Object.values(view.snapshot.carts).flatMap((cart) => cart.lines.map((line) => line.nftId)),
  )
  const cartNfts = view.snapshot.nftOrder.filter((entry) => cartIds.has(entry))
  const catalogNfts = view.snapshot.nftOrder.filter((entry) => !cartIds.has(entry))
  const groups = [...new Set(view.scenarios.map((entry) => entry.group))]
  const validStock =
    Number.isInteger(stock) && stock > 0 && (!edition?.supply || stock <= edition.supply)

  const copy = (text: string, label: 'E-mail' | 'Senha') =>
    act(`${label} ${label === 'Senha' ? 'copiada' : 'copiado'}.`, async () => {
      if (!navigator.clipboard) throw new Error('A cópia requer localhost ou uma conexão segura.')
      await navigator.clipboard.writeText(text)
    })

  return (
    <>
      <div className="space-y-5 overflow-y-auto overscroll-contain p-4">
        <Section title="Cenário">
          <label htmlFor={`${ids}-scenario`} className="block text-sand">
            Escolher cenário
          </label>
          <select
            id={`${ids}-scenario`}
            aria-describedby={`${ids}-scenario-description`}
            className={inputClass}
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
          >
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {view.scenarios
                  .filter((entry) => entry.group === group)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.id === view.config.scenario ? '✓ Atual · ' : ''}
                      {entry.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="flex items-center gap-2 text-sand">
            <Check size={14} aria-hidden="true" />
            Atual: {view.scenarios.find((entry) => entry.id === view.config.scenario)?.label}
          </p>
          <p id={`${ids}-scenario-description`} className="text-sand">
            {view.scenarios.find((entry) => entry.id === scenario)?.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() => void act('Cenário aplicado.', () => control.setScenario(scenario))}
            >
              Aplicar
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                void act('Cenário aplicado e dados reiniciados.', () =>
                  control.setScenario(scenario, { reset: true }),
                )
              }
            >
              Aplicar e reiniciar dados
            </button>
          </div>
        </Section>

        <Section title="Dados">
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              void act('Dados iniciais restaurados. Cenário padrão ativo.', () => {
                control.reset()
                setScenario('default')
              })
            }
          >
            <RefreshCw size={14} aria-hidden="true" />
            Restaurar dados iniciais
          </button>
        </Section>

        <Section title="Tempo real">
          <label htmlFor={`${ids}-nft`} className="block text-sand">
            NFT
          </label>
          <select
            id={`${ids}-nft`}
            value={nft?.id ?? ''}
            disabled={!nft}
            className={inputClass}
            onChange={(event) => {
              setNftId(event.target.value)
              setEditionId(null)
              const first = view.snapshot.nfts[event.target.value]?.editions.find(
                (entry) => entry.id === view.snapshot.nfts[event.target.value]?.defaultEditionId,
              )
              setStock(Math.min(10, first?.supply ?? 10))
            }}
          >
            {(
              [
                ['No carrinho', cartNfts],
                ['Catálogo', catalogNfts],
              ] as const
            ).map(
              ([label, entries]) =>
                entries.length > 0 && (
                  <optgroup key={label} label={label}>
                    {entries.map((entry) => (
                      <option key={entry} value={entry}>
                        {view.snapshot.nfts[entry]?.name}
                      </option>
                    ))}
                  </optgroup>
                ),
            )}
          </select>
          <label htmlFor={`${ids}-edition`} className="block text-sand">
            Edição
          </label>
          <select
            id={`${ids}-edition`}
            value={edition?.id ?? ''}
            disabled={!edition}
            className={inputClass}
            onChange={(event) => {
              const entry = nft?.editions.find((item) => item.id === event.target.value)
              if (entry) {
                setEditionId(entry.id)
                setStock(Math.min(10, entry.supply ?? 10))
              }
            }}
          >
            {nft?.editions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label} · {entry.price} ETH · {entry.available} disponíveis
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={!nft || !edition}
              onClick={() => {
                if (nft && edition)
                  void act('Preço aumentado em 0.1 ETH.', () =>
                    control.setPrice(nft.id, addEth(edition.price, '0.1'), edition.id),
                  )
              }}
            >
              Aumentar preço em 0.1 ETH
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!nft || !edition}
              onClick={() => {
                if (nft && edition)
                  void act('Edição esgotada.', () => control.setAvailability(nft.id, 0, edition.id))
              }}
            >
              Esgotar edição
            </button>
          </div>
          <label htmlFor={`${ids}-stock`} className="block text-sand">
            Estoque para reposição{edition?.supply ? ` (máximo ${edition.supply})` : ''}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`${ids}-stock`}
              type="number"
              min={1}
              max={edition?.supply ?? undefined}
              step={1}
              value={Number.isFinite(stock) ? stock : ''}
              onChange={(event) => setStock(event.target.valueAsNumber)}
              className={`${inputClass} flex-1 basis-24`}
            />
            <button
              type="button"
              className={`${buttonClass} shrink-0`}
              disabled={!nft || !edition || !validStock}
              onClick={() => {
                if (nft && edition && validStock)
                  void act(`Estoque reposto: ${stock} unidades.`, () =>
                    control.setAvailability(nft.id, stock, edition.id),
                  )
              }}
            >
              Repor estoque
            </button>
          </div>
          <p className="text-10 text-sand">{view.sockets} conexão(ões) de socket</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                void act('Socket derrubado. Reconexão liberada.', () => control.dropSockets())
              }
            >
              Derrubar socket
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                void act('Queda de socket iniciada por 6 s.', () => control.startSocketOutage(6000))
              }
            >
              Queda de 6 s
            </button>
          </div>
          <h3 className="font-bold">Últimos eventos</h3>
          {view.events.length === 0 ? (
            <p className="text-sand">Nenhum evento publicado.</p>
          ) : (
            <ul className="space-y-2">
              {view.events.map((event) => (
                <li
                  key={event.id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-line p-2"
                >
                  <span className="min-w-0 break-words">
                    <span className="block font-bold">{event.type}</span>
                    <span className="text-10 text-sand">
                      {event.resource.type}:{event.resource.id} · v{event.version}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`${buttonClass} shrink-0`}
                    aria-label={`Reenviar evento ${event.id}`}
                    onClick={() =>
                      void act('Evento reenviado sem alterar a versão.', () => {
                        if (!control.redeliver(event.id))
                          throw new Error('Este evento não está mais disponível.')
                      })
                    }
                  >
                    Reenviar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pedido">
          {view.pending.length === 0 ? (
            <p className="text-sand">Nenhum pedido pendente.</p>
          ) : (
            <ul className="space-y-3">
              {view.pending.map((orderId) => (
                <li key={orderId} className="space-y-2 rounded-md border border-line p-2">
                  <p className="break-words">
                    {orderId} · {view.snapshot.orders[orderId]?.total} ETH
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonClass}
                      aria-label={`Confirmar pedido ${orderId}`}
                      onClick={() =>
                        void act(`Pedido ${orderId} confirmado.`, () =>
                          control.settleOrder(orderId, 'confirmed'),
                        )
                      }
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      aria-label={`Recusar pedido ${orderId}`}
                      onClick={() =>
                        void act(`Pedido ${orderId} recusado.`, () =>
                          control.settleOrder(orderId, 'declined'),
                        )
                      }
                    >
                      Recusar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Sessão e carteira">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                void act('Sessão expirada no servidor simulado.', () => control.expireSessions())
              }
            >
              Expirar sessão
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                void act('Carteira desconectada no servidor simulado.', () =>
                  control.disconnectWallet(),
                )
              }
            >
              Desconectar carteira
            </button>
          </div>
        </Section>

        <Section title="Contas de teste">
          <ul className="space-y-3">
            {demoAccounts.map((account) => (
              <li key={account.email} className="space-y-2 rounded-md border border-line p-2">
                <p className="font-bold">{account.name}</p>
                <p className="break-all text-sand">{account.email}</p>
                <p className="text-sand">Senha: {account.password}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    aria-label={`Copiar e-mail de ${account.name}`}
                    onClick={() => void copy(account.email, 'E-mail')}
                  >
                    <Copy size={14} aria-hidden="true" />
                    E-mail
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    aria-label={`Copiar senha de ${account.name}`}
                    onClick={() => void copy(account.password, 'Senha')}
                  >
                    <Copy size={14} aria-hidden="true" />
                    Senha
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <p
        role="status"
        aria-atomic="true"
        className="shrink-0 border-t border-line bg-band px-4 py-3 text-10 text-sand"
      >
        {status}
      </p>
    </>
  )
}
