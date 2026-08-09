import { useState } from 'react'
import type { FormEvent } from 'react'
import { useDataStore } from '@/data/store'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface MeetingFormModalProps {
  open: boolean
  onClose: () => void
  defaultDate?: string | null
}

export function MeetingFormModal({ open, onClose, defaultDate }: MeetingFormModalProps) {
  const addCalendarEvent = useDataStore((s) => s.addCalendarEvent)
  const clients = useDataStore((s) => s.clients)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10))
  const [clientId, setClientId] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    addCalendarEvent({
      title,
      date,
      type: 'reuniao',
      scope: 'operacional',
      clientId: clientId || undefined,
    })
    setTitle('')
    setClientId('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova reunião" description="Aparece no calendário operacional (e no geral).">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="meetingTitle">Título</Label>
          <Input id="meetingTitle" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reunião com..." />
        </div>
        <div>
          <Label htmlFor="meetingDate">Data</Label>
          <Input id="meetingDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="meetingClient">Cliente (opcional)</Label>
          <Select id="meetingClient" value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
          <Button type="submit">Criar reunião</Button>
        </div>
      </form>
    </Modal>
  )
}
