import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-iter-border px-6 py-14 text-center">
      <div className="rounded-full bg-iter-surface-alt p-3">
        <Icon className="h-5 w-5 text-iter-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-iter-text">{title}</p>
        {description && <p className="mt-1 max-w-xs text-xs text-iter-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
