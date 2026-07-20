import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToggleChipProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  title?: string
  children: ReactNode
}

export function ToggleChip({ active, onClick, disabled, title, children }: ToggleChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-iter-primary/40 bg-iter-primary/10 text-iter-text' : 'border-iter-border text-iter-faint hover:text-iter-muted',
      )}
    >
      {children}
    </button>
  )
}
