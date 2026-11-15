import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-4 overflow-hidden rounded-4xl bg-card p-6 text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10', className)} {...props} />
}
