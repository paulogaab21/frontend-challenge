import { useId, type ComponentProps, type ReactNode } from 'react'

export type IconProps = Omit<ComponentProps<'svg'>, 'children'> & {
  size?: number | string
  title?: string
}

export function IconBase({
  size = 24,
  title,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  const id = useId()
  const labelled = Boolean(title || props['aria-label'] || props['aria-labelledby'])
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      focusable="false"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      aria-labelledby={title ? id : undefined}
      {...props}
    >
      {title && <title id={id}>{title}</title>}
      {children}
    </svg>
  )
}
