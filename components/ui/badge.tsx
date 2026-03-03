import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-border text-foreground',
        // Status variants — alineados con STATUS_COLORS de lib/ui/status-colors.ts
        active: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
        paused: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
        cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
        archived: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
        pending: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
