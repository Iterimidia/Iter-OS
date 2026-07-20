import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  markOnly?: boolean
}

export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-iter-primary to-iter-secondary text-sm font-bold text-white shadow-glow">
        I
      </span>
      {!markOnly && <span className="text-base font-semibold tracking-tight text-iter-text">Iter OS</span>}
    </div>
  )
}
