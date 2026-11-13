import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge must know the project's custom utilities, otherwise it mistakes
 * the extra type-scale steps (`text-13`, `text-15`…) for text *colors* and drops
 * them when a color such as `text-sand` appears in the same class list.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs', '10', '13', '15', '17', '22', '28', 'hero'] }],
      'bg-image': ['bg-copper-gradient'],
    },
  },
})

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs))
}
