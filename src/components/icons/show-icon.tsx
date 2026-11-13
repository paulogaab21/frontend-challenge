import { IconBase, type IconProps } from './icon-base'

export function ShowIcon({ size = 20, ...props }: IconProps) {
  return (
    <IconBase size={size} viewBox="0 0 20 20" {...props}>
      <path
        d="M1.26 10C1.26 7.27 5.17 3.92 10 3.92S18.74 7.27 18.74 10S14.83 16.08 10 16.08S1.26 12.73 1.26 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="10" cy="10" rx="2.98" ry="2.64" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  )
}
