import { AlertTriangle, CalendarClock, Clock, ExternalLink, Sparkles } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canViewFile, getAccessibleClients } from '@/lib/permissions'
import { useScopedCalendarEvents } from '@/lib/calendar'
import { addDaysIso, CONTENT_FORMAT_LABELS, formatDate, isOverdue } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const todayIso = new Date().toISOString().slice(0, 10)

export function CreativePanelPage() {
  const user = useCurrentUser()!
  const tasks = useDataStore((s) => s.tasks.filter((t) => t.area === 'criativo'))
  const contentItems = useDataStore((s) => s.contentItems)
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const files = useDataStore((s) => s.files)
  const events = useScopedCalendarEvents('criativo')

  const accessibleIds = new Set(getAccessibleClients(user, clients).map((c) => c.id))
  const items = contentItems.filter((c) => accessibleIds.has(c.clientId))

  const em7dias = addDaysIso(7)
  const tarefasSemana = tasks.filter((t) => t.dueDate && t.dueDate >= todayIso && t.dueDate <= em7dias)
  const tarefasAtrasadas = tasks.filter((t) => isOverdue(t.dueDate, ['concluido', 'publicado'].includes(t.status)))
  const emProducao = items.filter((i) => i.status === 'em_producao')
  const aguardandoRevisao = items.filter((i) => i.status === 'em_revisao_interna')
  const aguardandoCliente = items.filter((i) => i.status === 'aguardando_cliente')

  const creativeUsers = users.filter((u) => u.role === 'criativo' || u.role === 'gestao_criativa')
  const workload = creativeUsers.map((u) => ({
    user: u,
    count:
      items.filter((i) => i.responsibleId === u.id && i.status !== 'publicado').length +
      tasks.filter((t) => t.responsibleId === u.id && !['concluido', 'publicado'].includes(t.status)).length,
  }))

  const proximosPrazos = events.filter((e) => e.date >= todayIso).slice(0, 6)
  const recentFiles = files
    .filter((f) => canViewFile(user, f))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <SectionHeader title="Painel Criativo" description="Visão geral da produção da semana." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tarefas da semana" value={String(tarefasSemana.length)} icon={CalendarClock} />
        <StatCard
          label="Tarefas atrasadas"
          value={String(tarefasAtrasadas.length)}
          icon={AlertTriangle}
          tone={tarefasAtrasadas.length > 0 ? 'danger' : 'default'}
        />
        <StatCard label="Em produção" value={String(emProducao.length)} icon={Sparkles} tone="primary" />
        <StatCard label="Aguardando cliente" value={String(aguardandoCliente.length)} icon={Clock} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Demandas por Responsável" />
          {workload.length === 0 ? (
            <EmptyState title="Nenhum criativo cadastrado" />
          ) : (
            <div className="card-surface divide-y divide-iter-border">
              {workload.map(({ user: u, count }) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2.5 text-sm text-iter-text">
                    <Avatar name={u.name} initials={u.avatarInitials} color={u.avatarColor} size="sm" />
                    {u.name}
                  </span>
                  <Badge tone="neutral">{count} demanda(s)</Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Próximos Prazos" />
          {proximosPrazos.length === 0 ? (
            <EmptyState title="Nada nos próximos dias" />
          ) : (
            <div className="card-surface divide-y divide-iter-border">
              {proximosPrazos.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="truncate text-sm text-iter-text">{e.title}</span>
                  <span className="shrink-0 text-xs text-iter-faint">{formatDate(e.date)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Aguardando Revisão Interna" />
          {aguardandoRevisao.length === 0 ? (
            <EmptyState title="Nada aguardando revisão" />
          ) : (
            <div className="space-y-2">
              {aguardandoRevisao.map((i) => (
                <div key={i.id} className="card-surface flex items-center justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-iter-text">{i.title}</p>
                    <p className="text-xs text-iter-faint">{clients.find((c) => c.id === i.clientId)?.name}</p>
                  </div>
                  <Badge tone="neutral" className="shrink-0">
                    {CONTENT_FORMAT_LABELS[i.format]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Arquivos Recentes" />
          {recentFiles.length === 0 ? (
            <EmptyState title="Nenhum arquivo liberado" />
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card-surface flex items-center justify-between p-3.5 transition-colors hover:border-iter-primary/40"
                >
                  <span className="truncate text-sm text-iter-text">{f.name}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-iter-faint" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
