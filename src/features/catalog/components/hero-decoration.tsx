import { useId } from 'react'

/** The two overlapping circles exported from the mobile Figma banner. */
export function HeroDecoration() {
  const id = useId()
  return (
    <svg
      aria-hidden="true"
      viewBox="-56 70 401 269"
      className="pointer-events-none absolute -top-[31px] -left-20 h-[269px] w-[401px] md:hidden"
    >
      <defs>
        <linearGradient
          id={`${id}-left`}
          x1="93"
          y1="91"
          x2="163"
          y2="286"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--kurio-copper-soft)" stopOpacity="0.43" />
          <stop offset="1" stopColor="var(--kurio-copper)" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient
          id={`${id}-right`}
          x1="246"
          y1="112"
          x2="316"
          y2="307"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--kurio-copper-soft)" stopOpacity="0.37" />
          <stop offset="1" stopColor="var(--kurio-copper)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="68" cy="194" r="124" fill={`url(#${id}-left)`} />
      <circle cx="221" cy="215" r="124" fill={`url(#${id}-right)`} />
    </svg>
  )
}
