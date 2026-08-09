import type { CalendarEvent, Client } from '@/types'
import { CALENDAR_EVENT_META } from '@/lib/calendar'
import { cn, formatDateLong, PRIORITY_META } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CalendarDays, Trash2 } from 'lucide-react'

interface DayEventsPanelProps {
  date: string | null
  events: CalendarEvent[]
  clients?: Client[]
  onDeleteEvent?: (event: CalendarEvent) => void
}

export function DayEventsPanel({ date, events, clients = [], onDeleteEvent }: DayEventsPanelProps) {
  if (!date) {
    return (
      <div className="card-surface p-5">
        <EmptyState icon={CalendarDays} title="Selecione um dia" description="Clique em um dia do calendário para ver os eventos." />
      </div>
    )
  }

  const dayEvents = events.filter((e) => e.date === date)
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name

  return (
    <div className="card-surface p-5">
      <h3 className="text-sm font-semibold capitalize text-iter-text">{formatDateLong(date)}</h3>
      {dayEvents.length === 0 ? (
        <p className="mt-3 text-xs text-iter-muted">Nenhum evento neste dia.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {dayEvents.map((event) => (
            <li key={event.id} className="flex items-start gap-2.5 rounded-lg border border-iter-border bg-iter-surface-alt p-2.5">
              <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', CALENDAR_EVENT_META[event.type].className)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-iter-text">{event.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-iter-faint">
                  {CALENDAR_EVENT_META[event.type].label}
                  {clientName(event.clientId) ? ` · ${clientName(event.clientId)}` : ''}
                </p>
              </div>
              {event.priority && (
                <Badge tone={PRIORITY_META[event.priority].tone} className="shrink-0">
                  {PRIORITY_META[event.priority].label}
                </Badge>
              )}
              {event.source === 'manual' && onDeleteEvent && (
                <button
                  onClick={() => onDeleteEvent(event)}
                  className="focus-ring shrink-0 rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                  aria-label="Excluir evento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
