import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon?: LucideIcon
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
  tone?: 'default' | 'primary' | 'warning' | 'danger' | 'success'
  hint?: string
}

const toneGlow: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'from-iter-primary/10',
  primary: 'from-iter-primary/25',
  warning: 'from-iter-warning/20',
  danger: 'from-iter-danger/20',
  success: 'from-iter-success/20',
}

export function StatCard({ label, value, icon: Icon, trend, tone = 'default', hint }: StatCardProps) {
  return (
    <div className="card-surface relative overflow-hidden p-5 transition-colors hover:border-iter-text-faint/30">
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl', toneGlow[tone])} />
      <div className="relative flex items-start justify-between">
        <p className="text-xs font-medium text-iter-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-iter-faint" />}
      </div>
      <p className="relative mt-2 text-2xl font-semibold tracking-tight text-iter-text">{value}</p>
      {(trend || hint) && (
        <div className="relative mt-2 flex items-center gap-1.5 text-xs">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                trend.direction === 'up' && 'text-iter-success',
                trend.direction === 'down' && 'text-iter-danger',
                trend.direction === 'flat' && 'text-iter-muted',
              )}
            >
              {trend.direction === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {trend.direction === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {trend.direction === 'flat' && <Minus className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-iter-faint">{hint}</span>}
        </div>
      )}
    </div>
  )
}
