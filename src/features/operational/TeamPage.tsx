import { useState } from 'react'
import { Plus, ShieldCheck, UserX } from 'lucide-react'
import type { User } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { addDaysIso, cn, isOverdue, ROLE_LABELS } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { DataTable } from '@/components/tables/DataTable'
import { UserFormModal } from '@/features/operational/UserFormModal'

export function TeamPage() {
  const currentUser = useCurrentUser()!
  const users = useDataStore((s) => s.users)
  const tasks = useDataStore((s) => s.tasks)
  const updateUser = useDataStore((s) => s.updateUser)

  const [tab, setTab] = useState('usuarios')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)

  const canManage = canPerformAction(currentUser, 'gerenciar_usuarios')
  const seteDiasAtras = addDaysIso(-7)

  const workload = users.map((u) => {
    const userTasks = tasks.filter((t) => t.responsibleId === u.id)
    const abertas = userTasks.filter((t) => !['concluido', 'publicado'].includes(t.status))
    const atrasadas = userTasks.filter((t) => isOverdue(t.dueDate, ['concluido', 'publicado'].includes(t.status)))
    const concluidasSemana = userTasks.filter((t) => t.completedAt && t.completedAt >= seteDiasAtras)
    return { user: u, total: userTasks.length, abertas: abertas.length, atrasadas: atrasadas.length, concluidasSemana: concluidasSemana.length }
  })
  const maxAbertas = Math.max(1, ...workload.map((w) => w.abertas))

  return (
    <div>
      <SectionHeader
        title="Equipe"
        description="Usuários, cargos, permissões e carga de trabalho."
        action={
          canManage && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Novo usuário
            </Button>
          )
        }
      />

      <Tabs
        className="mb-5 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'usuarios', label: 'Usuários', count: users.length },
          { id: 'carga', label: 'Carga de Trabalho' },
        ]}
      />

      {tab === 'usuarios' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className={cn('card-surface p-5', !u.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} initials={u.avatarInitials} color={u.avatarColor} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-iter-text">{u.name}</p>
                    <p className="text-xs text-iter-faint">{u.jobTitle}</p>
                  </div>
                </div>
                {!u.active && <UserX className="h-4 w-4 text-iter-faint" />}
              </div>
              <p className="mt-3 truncate text-xs text-iter-muted">{u.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="primary">{ROLE_LABELS[u.role]}</Badge>
                {u.allowedClientIds !== 'all' && <Badge tone="neutral">{u.allowedClientIds.length} cliente(s)</Badge>}
              </div>
              {canManage && (
                <div className="mt-4 flex gap-2 border-t border-iter-border pt-3">
                  <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={() => setEditingUser(u)}>
                    Editar permissões
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateUser(u.id, { active: !u.active })}
                    title={u.active ? 'Desativar' : 'Ativar'}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'carga' && (
        <DataTable
          data={workload}
          keyField={(w) => w.user.id}
          columns={[
            {
              key: 'usuario',
              header: 'Usuário',
              render: (w) => (
                <span className="flex items-center gap-2">
                  <Avatar name={w.user.name} initials={w.user.avatarInitials} color={w.user.avatarColor} size="sm" />
                  {w.user.name}
                </span>
              ),
            },
            { key: 'abertas', header: 'Tarefas abertas', render: (w) => w.abertas },
            {
              key: 'atrasadas',
              header: 'Atrasadas',
              render: (w) => <span className={w.atrasadas > 0 ? 'font-medium text-iter-danger' : ''}>{w.atrasadas}</span>,
            },
            { key: 'concluidas', header: 'Concluídas (7 dias)', render: (w) => w.concluidasSemana },
            {
              key: 'carga',
              header: 'Carga relativa',
              render: (w) => (
                <div className="w-32">
                  <ProgressBar value={w.abertas} max={maxAbertas} tone={w.atrasadas > 0 ? 'danger' : 'primary'} />
                </div>
              ),
            },
          ]}
        />
      )}

      <UserFormModal open={creating} onClose={() => setCreating(false)} />
      <UserFormModal open={editingUser !== null} onClose={() => setEditingUser(null)} user={editingUser ?? undefined} />
    </div>
  )
}
