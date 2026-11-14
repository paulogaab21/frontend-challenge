import { useId } from 'react'

/**
 * The three decorative shapes drawn over the featured banner in the Figma file
 * (a faint outlined square and two fading discs), at their exact coordinates
 * inside the 310x470 banner.
 */
export function FeaturedBannerShapes() {
  const id = useId()
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 310 470"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <defs>
        <linearGradient
          id={`${id}-square`}
          x1="2"
          y1="286"
          x2="38"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--kurio-green)" />
          <stop offset="1" stopColor="var(--kurio-green)" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-disc`}
          x1="232"
          y1="319"
          x2="285"
          y2="396"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--kurio-copper)" />
          <stop offset="1" stopColor="var(--kurio-copper)" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-dot`}
          x1="32.67"
          y1="97"
          x2="50.33"
          y2="122.67"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--kurio-copper)" />
          <stop offset="1" stopColor="var(--kurio-copper)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x="17"
        y="300"
        width="20"
        height="20"
        rx="6"
        fill="none"
        stroke={`url(#${id}-square)`}
        strokeWidth="2"
        opacity="0.2"
      />
      <rect
        x="248"
        y="343"
        width="45"
        height="45"
        rx="22.5"
        fill={`url(#${id}-disc)`}
        fillOpacity="0.3"
      />
      <rect
        x="38"
        y="105"
        width="15"
        height="15"
        rx="7.5"
        fill={`url(#${id}-dot)`}
        fillOpacity="0.3"
      />
    </svg>
  )
}
