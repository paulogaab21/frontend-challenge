/**
 * Typed access to build-time configuration. Every `import.meta.env` read in the
 * app goes through this module so the configuration surface stays in one place.
 */
export const env = {
  /** Base URL of the REST API. */
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  /** Origin of the Socket.IO server. Empty string = same origin as the app. */
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  /** Whether the MSW layer (REST + Socket.IO simulation) is part of this build. */
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS === 'true',
  /** Scenario used when none was selected at runtime. */
  defaultMockScenario: import.meta.env.VITE_MOCK_SCENARIO || 'default',
  isDev: import.meta.env.DEV,
} as const
