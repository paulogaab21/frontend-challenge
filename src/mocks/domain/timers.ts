/**
 * Timers of the simulation (order settlement, wallet drops). They are keyed so a
 * job is never armed twice, and they store an absolute due time: after a page
 * reload the job is re-armed with whatever time is left.
 */

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function schedule(key: string, dueAt: number, run: () => void): void {
  cancel(key)
  const delay = Math.max(0, dueAt - Date.now())
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      run()
    }, delay),
  )
}

export function cancel(key: string): void {
  const timer = timers.get(key)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(key)
  }
}

export function cancelAll(): void {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
}
