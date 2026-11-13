/** Uses the viewer's local time zone, as the receipt reference does. */
export function formatOrderDate(value: string | null): string {
  if (!value) return '—'
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date(value))
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === name)?.value ?? ''
  const month = part('month').replace('.', '')
  return `${part('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part('year')}`
}
