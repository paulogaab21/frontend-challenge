/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the REST API (e.g. "/api"). */
  readonly VITE_API_URL?: string
  /** Origin of the Socket.IO server; empty means same origin. */
  readonly VITE_SOCKET_URL?: string
  /** "true" boots the MSW layer before the app renders. */
  readonly VITE_ENABLE_MOCKS?: string
  /** Default mock scenario id. */
  readonly VITE_MOCK_SCENARIO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
