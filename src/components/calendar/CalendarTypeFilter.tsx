import { Filter } from 'lucide-react'
import type { CalendarEventType } from '@/types'
import { CALENDAR_EVENT_META } from '@/lib/calendar'
import { cn } from '@/lib/utils'

interface CalendarTypeFilterProps {
  types: CalendarEventType[]
  hidden: Set<CalendarEventType>
  onToggle: (type: CalendarEventType) => void
}

/** hidden = tipos ocultos; por padrão nada está oculto (mostra tudo). */
export function CalendarTypeFilter({ types, hidden, onToggle }: CalendarTypeFilterProps) {
  if (types.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-iter-faint">
        <Filter className="h-3.5 w-3.5" />
        Filtrar:
      </span>
      {types.map((type) => {
        const isVisible = !hidden.has(type)
        const meta = CALENDAR_EVENT_META[type]
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={cn(
              'focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isVisible
                ? 'border-iter-border bg-iter-surface-alt text-iter-text'
                : 'border-iter-border/50 text-iter-faint opacity-60 hover:opacity-100',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.className)} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
