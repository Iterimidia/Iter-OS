import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { CalendarEvent, CalendarEventType } from '@/types'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { useCurrentUser } from '@/features/auth/useAuth'
import { EVENT_TYPE_ORDER, useScopedCalendarEvents } from '@/lib/calendar'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Button } from '@/components/ui/Button'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { DayEventsPanel } from '@/components/calendar/DayEventsPanel'
import { CalendarTypeFilter } from '@/components/calendar/CalendarTypeFilter'
import { MeetingFormModal } from '@/features/operational/MeetingFormModal'

const todayIso = new Date().toISOString().slice(0, 10)

export function OperationalCalendarPage() {
  const user = useCurrentUser()!
  const allEvents = useScopedCalendarEvents('operacional')
  const clients = useDataStore((s) => s.clients)
  const removeCalendarEvent = useDataStore((s) => s.removeCalendarEvent)

  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso)
  const [hidden, setHidden] = useState<Set<CalendarEventType>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const canCreate = canPerformAction(user, 'criar')
  const canEditEvent = canPerformAction(user, 'editar')
  const canDelete = canPerformAction(user, 'excluir')

  const presentTypes = useMemo(() => EVENT_TYPE_ORDER.filter((t) => allEvents.some((e) => e.type === t)), [allEvents])
  const events = useMemo(() => allEvents.filter((e) => !hidden.has(e.type)), [allEvents, hidden])

  function toggleType(type: CalendarEventType) {
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  function handleDeleteEvent(event: CalendarEvent) {
    if (window.confirm(`Excluir "${event.title}"?`)) {
      removeCalendarEvent(event.id)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Calendário"
        description="Prazos de tarefas, entregas, vencimentos e reuniões da operação — tudo num só lugar."
        action={
          canCreate && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Nova reunião
            </Button>
          )
        }
      />
      <CalendarTypeFilter types={presentTypes} hidden={hidden} onToggle={toggleType} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <MonthCalendar events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <DayEventsPanel
          date={selectedDate}
          events={events}
          clients={clients}
          onEditEvent={canEditEvent ? setEditingEvent : undefined}
          onDeleteEvent={canDelete ? handleDeleteEvent : undefined}
        />
      </div>

      <MeetingFormModal open={modalOpen} onClose={() => setModalOpen(false)} defaultDate={selectedDate} />
      <MeetingFormModal open={editingEvent !== null} onClose={() => setEditingEvent(null)} event={editingEvent ?? undefined} />
    </div>
  )
}
