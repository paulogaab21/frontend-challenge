import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Register Kurio's type scale so text-13/text-15 are not mistaken for colors.
// This stays inside the UI kit's ownership boundary until the shared utility
// can adopt the same configuration during integration.
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs', '10', '13', '15', '17', '22', '28', 'hero'] }],
      'bg-image': ['bg-copper-gradient'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
