import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { BaseId, Priority, Task, TaskStatus } from '@/types'
import { useDataStore } from '@/data/store'
import { PRIORITY_META, resolveCompletedAtOnStatusChange, TASK_STATUS_META, TASK_STATUS_ORDER } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface TaskFormModalProps {
  open: boolean
  onClose: () => void
  defaultArea?: BaseId
  task?: Task
}

const PRIORITIES: Priority[] = ['baixa', 'media', 'alta', 'urgente']

function toFormState(task: Task | undefined, defaultArea: BaseId) {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    clientId: task?.clientId ?? '',
    projectId: task?.projectId ?? '',
    responsibleId: task?.responsibleId ?? '',
    dueDate: task?.dueDate ?? '',
    priority: task?.priority ?? ('media' as Priority),
    status: task?.status ?? ('a_fazer' as TaskStatus),
    type: task?.type ?? '',
    area: task?.area ?? defaultArea,
  }
}

export function TaskFormModal({ open, onClose, defaultArea = 'operacional', task }: TaskFormModalProps) {
  const addTask = useDataStore((s) => s.addTask)
  const updateTask = useDataStore((s) => s.updateTask)
  const clients = useDataStore((s) => s.clients)
  const projects = useDataStore((s) => s.projects)
  const users = useDataStore((s) => s.users)
  const appSettings = useDataStore((s) => s.appSettings)

  const [form, setForm] = useState(() => toFormState(task, defaultArea))
  const [submitting, setSubmitting] = useState(false)
  const availableProjects = projects.filter((p) => !form.clientId || p.clientId === form.clientId)

  useEffect(() => {
    if (open) {
      setForm(toFormState(task, defaultArea))
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !form.title.trim() || !form.responsibleId) return
    setSubmitting(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        clientId: form.clientId || undefined,
        projectId: form.projectId || undefined,
        responsibleId: form.responsibleId,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        status: form.status,
        type: form.type || 'Geral',
        area: form.area,
        // Regra única (src/lib/utils.ts), igual ao Kanban/StatusSelect de
        // OperationPage: entrar em "concluído" carimba hoje, sair de
        // "concluído" (reabrir) limpa completedAt de verdade (null --
        // undefined nunca chegaria a limpar a coluna no Supabase),
        // permanecer concluído preserva a data.
        completedAt: resolveCompletedAtOnStatusChange(task?.status, task?.completedAt, form.status),
      }
      const result = task ? await updateTask(task.id, payload) : await addTask(payload)
      if (result.ok) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Editar tarefa' : 'Nova tarefa'}
      description="Vincule a um cliente e/ou projeto — o prazo aparece automaticamente no calendário."
      size="lg"
    >
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
            <Select id="clientId" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, projectId: '' })}>
              <option value="">Nenhum</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="projectId">Projeto</Label>
            <Select id="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Nenhum</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
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
            <Label htmlFor="area">Área</Label>
            <Select id="area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value as BaseId })}>
              <option value="operacional">Operacional</option>
              <option value="criativo">Criativo</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Prazo</Label>
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
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
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Input
              id="type"
              list="task-type-options"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="Escolha ou escreva um tipo..."
            />
            <datalist id="task-type-options">
              {appSettings.taskTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="status">Status inicial</Label>
            <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
              {TASK_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {task ? 'Salvar alterações' : 'Criar tarefa'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
