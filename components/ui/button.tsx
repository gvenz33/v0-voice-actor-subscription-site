import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Solid, purpose-driven button colors:
 * - default: primary actions (subscribe, save, continue)
 * - accent: creative / AI / generate
 * - success: confirm, positive outcomes, money-in
 * - warning: caution / attention CTAs
 * - destructive: delete / irreversible
 * - secondary / outline / ghost: lower emphasis
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        accent:
          'bg-artist-violet text-white hover:bg-artist-violet/90 shadow-sm',
        success:
          'bg-[oklch(0.42_0.16_145)] text-[oklch(0.15_0.06_285)] hover:bg-[oklch(0.38_0.16_145)] shadow-sm',
        warning:
          'bg-artist-orange text-[oklch(0.15_0.06_285)] hover:bg-artist-orange/90 shadow-sm',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 shadow-sm',
        outline:
          'border-2 border-border bg-card text-foreground hover:bg-muted hover:text-foreground shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
        ghost:
          'bg-transparent text-foreground hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
