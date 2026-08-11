import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { CalendarEvent } from '@/types'
import { useDataStore } from '@/data/store'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface MeetingFormModalProps {
  open: boolean
  onClose: () => void
  defaultDate?: string | null
  event?: CalendarEvent
}

function toFormState(event: CalendarEvent | undefined, defaultDate?: string | null) {
  return {
    title: event?.title ?? '',
    date: event?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
    clientId: event?.clientId ?? '',
  }
}

export function MeetingFormModal({ open, onClose, defaultDate, event }: MeetingFormModalProps) {
  const addCalendarEvent = useDataStore((s) => s.addCalendarEvent)
  const updateCalendarEvent = useDataStore((s) => s.updateCalendarEvent)
  const clients = useDataStore((s) => s.clients)

  const [form, setForm] = useState(() => toFormState(event, defaultDate))

  useEffect(() => {
    if (open) setForm(toFormState(event, defaultDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, open])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    const payload = {
      title: form.title,
      date: form.date,
      clientId: form.clientId || undefined,
    }
    if (event) {
      updateCalendarEvent(event.id, payload)
    } else {
      addCalendarEvent({ ...payload, type: 'reuniao', scope: 'operacional' })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={event ? 'Editar reunião' : 'Nova reunião'} description="Aparece no calendário operacional (e no geral).">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="meetingTitle">Título</Label>
          <Input id="meetingTitle" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Reunião com..." />
        </div>
        <div>
          <Label htmlFor="meetingDate">Data</Label>
          <Input id="meetingDate" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="meetingClient">Cliente (opcional)</Label>
          <Select id="meetingClient" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{event ? 'Salvar alterações' : 'Criar reunião'}</Button>
        </div>
      </form>
    </Modal>
  )
}
