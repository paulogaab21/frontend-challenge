import { realtimeHandlers } from '../realtime/server'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { orderHandlers } from './orders'
import { notFoundHandler } from './route'

/** REST handlers first (most specific), the API catch-all last, then realtime. */
export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  notFoundHandler,
  ...realtimeHandlers,
]
