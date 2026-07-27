import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Priority, ProjectStatus } from '@/types'
import { useDataStore } from '@/data/store'
import { PRIORITY_META, PROJECT_STATUS_META } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ToggleChip } from '@/components/ui/ToggleChip'

interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
}

const STATUS_OPTIONS: ProjectStatus[] = ['planejamento', 'em_andamento', 'pausado', 'concluido']
const PRIORITIES: Priority[] = ['baixa', 'media', 'alta', 'urgente']

const emptyForm = {
  title: '',
  clientId: '',
  description: '',
  responsibleId: '',
  teamIds: [] as string[],
  status: 'planejamento' as ProjectStatus,
  startDate: '',
  endDate: '',
  priority: 'media' as Priority,
}

export function ProjectFormModal({ open, onClose }: ProjectFormModalProps) {
  const addProject = useDataStore((s) => s.addProject)
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const [form, setForm] = useState(emptyForm)

  function toggleTeamMember(userId: string) {
    setForm((f) => ({
      ...f,
      teamIds: f.teamIds.includes(userId) ? f.teamIds.filter((id) => id !== userId) : [...f.teamIds, userId],
    }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.clientId || !form.responsibleId || !form.startDate || !form.endDate) return
    addProject(form)
    setForm(emptyForm)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo projeto" description="Vincule a um cliente — as tarefas dele poderão apontar pra este projeto." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="clientId">Cliente</Label>
            <Select id="clientId" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="responsibleId">Responsável</Label>
            <Select id="responsibleId" required value={form.responsibleId} onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}>
              <option value="">Selecione</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="startDate">Início</Label>
            <Input id="startDate" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="endDate">Prazo final</Label>
            <Input id="endDate" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <Select id="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Equipe envolvida</Label>
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => (
              <ToggleChip key={u.id} active={form.teamIds.includes(u.id)} onClick={() => toggleTeamMember(u.id)}>
                {u.name}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Criar projeto</Button>
        </div>
      </form>
    </Modal>
  )
}
