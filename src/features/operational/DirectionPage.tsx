import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CalendarCheck2, CheckCircle2, Layers, TrendingUp, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { addDaysIso, CLIENT_STATUS_META, cn, formatCurrency, formatDate, isOverdue, isThisMonth, PRIORITY_META } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const todayIso = new Date().toISOString().slice(0, 10)

export function DirectionPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const clients = useDataStore((s) => s.clients)
  const projects = useDataStore((s) => s.projects)
  const tasks = useDataStore((s) => s.tasks)
  const leads = useDataStore((s) => s.leads)
  const financialEntries = useDataStore((s) => s.financialEntries)
  const contentItems = useDataStore((s) => s.contentItems)

  const clientesAtivos = clients.filter((c) => c.status === 'ativo')
  const clientesAtencao = clients.filter((c) => c.status === 'em_atencao')
  const clientesRisco = clients.filter((c) => c.status === 'em_risco')
  const clientesAlerta = [...clientesRisco, ...clientesAtencao]
  const projetosAtivos = projects.filter((p) => p.status === 'em_andamento')
  const tarefasAtrasadas = tasks.filter((t) => isOverdue(t.dueDate, ['concluido', 'publicado'].includes(t.status)))
  const receitaMes = financialEntries.filter((f) => f.type === 'receita' && isThisMonth(f.dueDate)).reduce((s, f) => s + f.amount, 0)
  const contasVencidas = financialEntries.filter((f) => f.status === 'vencido')

  const seteDiasAtras = addDaysIso(-7)
  const concluidasSemana = tasks.filter((t) => t.completedAt && t.completedAt >= seteDiasAtras)
  const publicadosSemana = contentItems.filter((c) => c.publishDate && c.publishDate >= seteDiasAtras && c.publishDate <= todayIso)
  const leadsNovosSemana = leads.filter((l) => l.createdAt >= seteDiasAtras)
  const tarefasCriticasAtrasadas = tarefasAtrasadas.filter((t) => t.priority === 'urgente' || t.priority === 'alta')

  const semAlertas = tarefasCriticasAtrasadas.length === 0 && clientesRisco.length === 0 && contasVencidas.length === 0

  return (
    <div className="space-y-8">
      <SectionHeader title="Direção" description="Dashboard executivo — saúde da operação, gargalos e prioridades da semana." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={String(clientesAtivos.length)} icon={Users} tone="success" />
        <StatCard label="Projetos ativos" value={String(projetosAtivos.length)} icon={Layers} />
        <StatCard
          label="Tarefas atrasadas"
          value={String(tarefasAtrasadas.length)}
          icon={AlertTriangle}
          tone={tarefasAtrasadas.length > 0 ? 'danger' : 'default'}
        />
        {canPerformAction(user, 'ver_financeiro') && (
          <StatCard label="Receita prevista" value={formatCurrency(receitaMes)} icon={TrendingUp} tone="primary" hint="este mês" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Saúde dos Clientes" description="Quem precisa de atenção agora." />
          {clientesAlerta.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tudo tranquilo" description="Nenhum cliente em atenção ou em risco no momento." />
          ) : (
            <div className="space-y-3">
              {clientesAlerta.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/operacional/clientes/${client.id}`)}
                  className="card-surface flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:border-iter-primary/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-iter-text">{client.name}</p>
                      <Badge tone={CLIENT_STATUS_META[client.status].tone}>{CLIENT_STATUS_META[client.status].label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-iter-muted">{client.pendencies ?? 'Sem detalhes registrados.'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Resumo da Semana" description="Últimos 7 dias." />
          <div className="card-surface divide-y divide-iter-border">
            <SummaryRow icon={CheckCircle2} label="Tarefas concluídas" value={concluidasSemana.length} />
            <SummaryRow icon={TrendingUp} label="Conteúdos publicados" value={publicadosSemana.length} />
            <SummaryRow icon={Users} label="Novos leads" value={leadsNovosSemana.length} />
            <SummaryRow
              icon={CalendarCheck2}
              label="Tarefas urgentes/altas atrasadas"
              value={tarefasCriticasAtrasadas.length}
              warn={tarefasCriticasAtrasadas.length > 0}
            />
          </div>
        </section>
      </div>

      <section>
        <SectionHeader title="Atenção Necessária" description="Gargalos e alertas que pedem uma decisão da direção." />
        {semAlertas ? (
          <EmptyState icon={CheckCircle2} title="Nenhum alerta crítico" description="Operação sem gargalos no momento." />
        ) : (
          <div className="space-y-2.5">
            {clientesRisco.map((c) => (
              <AlertRow
                key={c.id}
                tone="danger"
                title={`${c.name} está em risco`}
                description={c.pendencies ?? 'Acompanhar de perto.'}
                onClick={() => navigate(`/operacional/clientes/${c.id}`)}
              />
            ))}
            {tarefasCriticasAtrasadas.map((t) => (
              <AlertRow
                key={t.id}
                tone="warning"
                title={`Tarefa atrasada: ${t.title}`}
                description={`Prioridade ${PRIORITY_META[t.priority].label.toLowerCase()} · prazo era ${t.dueDate ? formatDate(t.dueDate) : '—'}`}
                onClick={() => navigate('/operacional/operacao')}
              />
            ))}
            {canPerformAction(user, 'ver_financeiro') &&
              contasVencidas.map((f) => (
                <AlertRow
                  key={f.id}
                  tone="danger"
                  title={`Conta vencida: ${f.description}`}
                  description={`${formatCurrency(f.amount)} · venceu em ${formatDate(f.dueDate)}`}
                  onClick={() => navigate('/operacional/financeiro')}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value, warn }: { icon: LucideIcon; label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="flex items-center gap-2.5 text-sm text-iter-muted">
        <Icon className="h-4 w-4 text-iter-faint" />
        {label}
      </span>
      <span className={cn('text-sm font-semibold', warn ? 'text-iter-danger' : 'text-iter-text')}>{value}</span>
    </div>
  )
}

function AlertRow({
  tone,
  title,
  description,
  onClick,
}: {
  tone: 'danger' | 'warning'
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="card-surface flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-iter-primary/40">
      <span className={cn('mt-0.5 rounded-full p-1.5', tone === 'danger' ? 'bg-iter-danger/10 text-iter-danger' : 'bg-iter-warning/10 text-iter-warning')}>
        <AlertTriangle className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-iter-text">{title}</p>
        <p className="mt-0.5 text-xs text-iter-muted">{description}</p>
      </div>
    </button>
  )
}
