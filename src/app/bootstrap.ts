import { env } from '@/lib/env'
import { NetworkError, setTransportReady } from '@/lib/http'

/**
 * Brings the network layer up without blocking the first paint.
 *
 * In the demo build (`VITE_ENABLE_MOCKS=true`) the simulated backend lives in the
 * browser: a service worker answers REST and a WebSocket interceptor answers
 * Socket.IO. Its code is a separate chunk loaded here; requests and the realtime
 * connection simply wait for this promise. With mocks disabled nothing is loaded
 * and the transport is ready immediately.
 */
export function startTransport(): Promise<void> {
  const ready: Promise<void> = env.enableMocks
    ? import('@/mocks/browser')
        .then(({ startMockServer }) => startMockServer())
        .then(() => undefined)
        .catch((cause: unknown) => {
          console.error('[kurio] The simulated backend could not start.', cause)
          throw new NetworkError(
            'Não foi possível iniciar o ambiente de demonstração. Recarregue a página.',
          )
        })
    : Promise.resolve()

  setTransportReady(ready)
  // The rejection is delivered to each request; avoid an unhandled rejection here.
  ready.catch(() => undefined)
  return ready
}
