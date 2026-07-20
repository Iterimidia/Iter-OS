import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import { CALENDAR_EVENT_META, EVENT_TYPE_ORDER, groupEventsByDate } from '@/lib/calendar'
import { cn, isOverdue } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface MonthCalendarProps {
  events: CalendarEvent[]
  selectedDate: string | null
  onSelectDate: (dateIso: string) => void
}

export function MonthCalendar({ events, selectedDate, onSelectDate }: MonthCalendarProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const byDate = useMemo(() => groupEventsByDate(events), [events])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const presentTypes = useMemo(
    () => EVENT_TYPE_ORDER.filter((type) => events.some((e) => e.type === type)),
    [events],
  )

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-iter-border p-4">
        <h2 className="text-sm font-semibold capitalize text-iter-text">
          {format(cursor, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => subMonths(c, 1))} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-iter-border text-center text-[10px] font-medium uppercase tracking-wide text-iter-faint sm:text-[11px]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = byDate[key] ?? []
          const inMonth = isSameMonth(day, cursor)
          const today = isToday(day)
          const selected = selectedDate ? isSameDay(day, new Date(`${selectedDate}T12:00:00`)) : false

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              className={cn(
                'min-h-[76px] border-b border-r border-iter-border/70 p-1.5 text-left align-top transition-colors hover:bg-iter-surface-alt sm:min-h-[108px] sm:p-2',
                !inMonth && 'bg-iter-bg-alt/40',
                selected && 'ring-1 ring-inset ring-iter-primary/60',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  today ? 'bg-iter-primary text-white' : inMonth ? 'text-iter-text' : 'text-iter-faint',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-1 truncate rounded bg-iter-surface-hover px-1 py-0.5 text-left text-[10px] font-medium text-iter-text sm:text-[11px]"
                    title={event.title}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        CALENDAR_EVENT_META[event.type].className,
                        isOverdue(event.date, event.status === 'concluido' || event.status === 'publicado') && 'animate-pulse',
                      )}
                    />
                    <span className="hidden truncate sm:inline">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block px-1 text-[10px] text-iter-faint">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {presentTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-iter-border px-4 py-3">
          {presentTypes.map((type) => (
            <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-iter-muted">
              <span className={cn('h-1.5 w-1.5 rounded-full', CALENDAR_EVENT_META[type].className)} />
              {CALENDAR_EVENT_META[type].label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
