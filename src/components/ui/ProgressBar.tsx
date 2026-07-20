import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  tone?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const toneClass: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  primary: 'bg-iter-primary',
  success: 'bg-iter-success',
  warning: 'bg-iter-warning',
  danger: 'bg-iter-danger',
}

export function ProgressBar({ value, max = 100, tone = 'primary', className }: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-iter-surface-hover', className)}>
      <div className={cn('h-full rounded-full transition-all duration-300', toneClass[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}
