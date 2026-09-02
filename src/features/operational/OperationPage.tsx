import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Priority, Task, TaskStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { cn, formatDate, isOverdue, PRIORITY_META, TASK_STATUS_META, TASK_STATUS_ORDER } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { StatusSelect } from '@/components/ui/StatusSelect'
import { KanbanBoard } from '@/components/tables/KanbanBoard'
import { DataTable } from '@/components/tables/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { TaskFormModal } from '@/features/operational/TaskFormModal'

const KANBAN_COLUMNS = TASK_STATUS_ORDER.map((id) => ({ id, label: TASK_STATUS_META[id].label }))
const STATUS_OPTIONS = TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS_META[s].label }))
const PRIORITIES: Priority[] = ['baixa', 'media', 'alta', 'urgente']

export function OperationPage() {
  const user = useCurrentUser()!
  const tasks = useDataStore((s) => s.tasks.filter((t) => t.area === 'operacional'))
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const updateTask = useDataStore((s) => s.updateTask)
  const removeTask = useDataStore((s) => s.removeTask)

  const [tab, setTab] = useState('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [query, setQuery] = useState('')
  const [responsibleFilter, setResponsibleFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')

  const canCreate = canPerformAction(user, 'criar')
  const canEditTask = canPerformAction(user, 'editar')
  const canDelete = canPerformAction(user, 'excluir')

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  const filteredTasks = tasks.filter((t) => {
    if (responsibleFilter !== 'all' && t.responsibleId !== responsibleFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (query) {
      const q = query.toLowerCase()
      const matches = t.title.toLowerCase().includes(q) || (clientName(t.clientId) ?? '').toLowerCase().includes(q)
      if (!matches) return false
    }
    return true
  })

  function changeStatus(task: Task, status: TaskStatus) {
    updateTask(task.id, {
      status,
      completedAt: status === 'concluido' ? new Date().toISOString().slice(0, 10) : task.completedAt,
    })
  }

  function handleDeleteTask(task: Task) {
    if (window.confirm(`Excluir a tarefa "${task.title}"?`)) {
      removeTask(task.id)
    }
  }

  const aprovacoes = filteredTasks.filter((t) => ['aguardando_revisao', 'aguardando_cliente', 'aprovado'].includes(t.status))

  return (
    <div>
      <SectionHeader
        title="Operação"
        description="Tarefas gerais, prazos e aprovações da execução."
        action={
          canCreate && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Nova tarefa
            </Button>
          )
        }
      />

      <Tabs
        className="mb-5 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'kanban', label: 'Kanban Operacional', count: filteredTasks.length },
          { id: 'tarefas', label: 'Tarefas', count: filteredTasks.length },
          { id: 'aprovacoes', label: 'Aprovações', count: aprovacoes.length },
        ]}
      />

      {(tab === 'kanban' || tab === 'tarefas' || tab === 'aprovacoes') && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
            <Input placeholder="Buscar tarefa ou cliente..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} className="sm:w-48">
            <option value="all">Todos os responsáveis</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)} className="sm:w-40">
            <option value="all">Toda prioridade</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {tab === 'kanban' && (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={filteredTasks}
          getId={(t) => t.id}
          getStatus={(t) => t.status}
          onStatusChange={changeStatus}
          canChangeStatus={canEditTask}
          renderCard={(task) => (
            <div className="card-surface space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold leading-snug text-iter-text">{task.title}</p>
                <div className="flex shrink-0 items-center gap-1">
                  {canEditTask && (
                    <button
                      onClick={() => setEditingTask(task)}
                      className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-text"
                      aria-label="Editar tarefa"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                      aria-label="Excluir tarefa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clientName(task.clientId) && <Badge tone="neutral">{clientName(task.clientId)}</Badge>}
                <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
              </div>
              <p className="text-[11px] text-iter-muted">{userName(task.responsibleId)}</p>
              {task.dueDate && (
                <p
                  className={cn(
                    'flex items-center gap-1 text-[11px]',
                    isOverdue(task.dueDate, ['concluido', 'publicado'].includes(task.status)) ? 'text-iter-danger' : 'text-iter-faint',
                  )}
                >
                  {isOverdue(task.dueDate, ['concluido', 'publicado'].includes(task.status)) && <AlertTriangle className="h-3 w-3" />}
                  {formatDate(task.dueDate)}
                </p>
              )}
              <StatusSelect value={task.status} onChange={(status) => changeStatus(task, status)} disabled={!canEditTask} options={STATUS_OPTIONS} />
            </div>
          )}
        />
      )}

      {tab === 'tarefas' && (
        <DataTable
          data={filteredTasks.slice().sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))}
          keyField={(t) => t.id}
          emptyTitle="Nenhuma tarefa"
          columns={[
            { key: 'titulo', header: 'Tarefa', render: (t) => <span className="font-medium text-iter-text">{t.title}</span> },
            { key: 'cliente', header: 'Cliente', render: (t) => clientName(t.clientId) ?? '—' },
            { key: 'responsavel', header: 'Responsável', render: (t) => userName(t.responsibleId) },
            { key: 'prazo', header: 'Prazo', render: (t) => (t.dueDate ? formatDate(t.dueDate) : '—') },
            {
              key: 'prioridade',
              header: 'Prioridade',
              render: (t) => <Badge tone={PRIORITY_META[t.priority].tone}>{PRIORITY_META[t.priority].label}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (t) => <StatusSelect value={t.status} onChange={(status) => changeStatus(t, status)} disabled={!canEditTask} options={STATUS_OPTIONS} />,
            },
            {
              key: 'acoes',
              header: '',
              render: (t: Task) => (
                <div className="flex items-center gap-1">
                  {canEditTask && (
                    <button
                      onClick={() => setEditingTask(t)}
                      className="focus-ring rounded-md p-1 text-iter-faint hover:text-iter-text"
                      aria-label="Editar tarefa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteTask(t)}
                      className="focus-ring rounded-md p-1 text-iter-faint hover:text-iter-danger"
                      aria-label="Excluir tarefa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === 'aprovacoes' &&
        (aprovacoes.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nada aguardando aprovação" />
        ) : (
          <div className="space-y-2.5">
            {aprovacoes.map((t) => (
              <div key={t.id} className="card-surface flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-iter-text">{t.title}</p>
                  <p className="mt-0.5 text-xs text-iter-muted">
                    {clientName(t.clientId) ?? 'Interno'} · {userName(t.responsibleId)}
                  </p>
                </div>
                <Badge tone={TASK_STATUS_META[t.status].tone}>{TASK_STATUS_META[t.status].label}</Badge>
              </div>
            ))}
          </div>
        ))}

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <TaskFormModal open={editingTask !== null} onClose={() => setEditingTask(null)} task={editingTask ?? undefined} />
    </div>
  )
}
