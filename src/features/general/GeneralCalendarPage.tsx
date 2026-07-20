import { useMemo, useState } from 'react'
import type { CalendarEventType } from '@/types'
import { useDataStore } from '@/data/store'
import { EVENT_TYPE_ORDER, useScopedCalendarEvents } from '@/lib/calendar'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { DayEventsPanel } from '@/components/calendar/DayEventsPanel'
import { CalendarTypeFilter } from '@/components/calendar/CalendarTypeFilter'

const todayIso = new Date().toISOString().slice(0, 10)

export function GeneralCalendarPage() {
  const allEvents = useScopedCalendarEvents('geral')
  const clients = useDataStore((s) => s.clients)
  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso)
  const [hidden, setHidden] = useState<Set<CalendarEventType>>(new Set())

  const presentTypes = useMemo(() => EVENT_TYPE_ORDER.filter((t) => allEvents.some((e) => e.type === t)), [allEvents])
  const events = useMemo(() => allEvents.filter((e) => !hidden.has(e.type)), [allEvents, hidden])

  function toggleType(type: CalendarEventType) {
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  return (
    <div>
      <SectionHeader
        title="Calendário Geral"
        description="Tarefas, publicações, reuniões, vencimentos, follow-ups e entregas de toda a operação."
      />
      <CalendarTypeFilter types={presentTypes} hidden={hidden} onToggle={toggleType} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <MonthCalendar events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <DayEventsPanel date={selectedDate} events={events} clients={clients} />
      </div>
    </div>
  )
}
