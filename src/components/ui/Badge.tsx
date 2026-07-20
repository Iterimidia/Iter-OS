import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-iter-surface-hover text-iter-muted border-iter-border',
  info: 'bg-iter-info/10 text-iter-info border-iter-info/25',
  warning: 'bg-iter-warning/10 text-iter-warning border-iter-warning/25',
  success: 'bg-iter-success/10 text-iter-success border-iter-success/25',
  danger: 'bg-iter-danger/10 text-iter-danger border-iter-danger/25',
  primary: 'bg-iter-primary/10 text-iter-primary border-iter-primary/25',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
