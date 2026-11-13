import type { ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-b border-line pb-4 last:border-0">
      <legend className="mb-3 text-sm font-bold text-copper">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  )
}
