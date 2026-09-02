import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileBarChart2,
  Handshake,
  Image,
  Layers,
  ListTodo,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { useScopedCalendarEvents } from '@/lib/calendar'
import { canViewArea, canViewDashboardCard } from '@/lib/permissions'
import { addDaysIso, formatCurrency, isOverdue, isThisMonth } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

const todayIso = new Date().toISOString().slice(0, 10)

export function GeneralDashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const clients = useDataStore((s) => s.clients)
  const tasks = useDataStore((s) => s.tasks)
  const projects = useDataStore((s) => s.projects)
  const leads = useDataStore((s) => s.leads)
  const financialEntries = useDataStore((s) => s.financialEntries)
  const contentItems = useDataStore((s) => s.contentItems)
  const dashboardCards = useDataStore((s) => s.dashboardCards)
  const appSettings = useDataStore((s) => s.appSettings)
  const events = useScopedCalendarEvents('geral')

  const visible = (id: string) => {
    const card = dashboardCards.find((c) => c.id === id)
    return !!card && canViewDashboardCard(user, card)
  }

  const receitaPrevista = financialEntries
    .filter((f) => f.type === 'receita' && isThisMonth(f.dueDate))
    .reduce((s, f) => s + f.amount, 0)
  const receitaRecebida = financialEntries
    .filter((f) => f.type === 'receita' && f.status === 'pago' && isThisMonth(f.paidDate ?? f.dueDate))
    .reduce((s, f) => s + f.amount, 0)
  const despesasMes = financialEntries
    .filter((f) => f.type === 'despesa' && isThisMonth(f.dueDate))
    .reduce((s, f) => s + f.amount, 0)
  const lucroEstimado = receitaPrevista - despesasMes
  const contasPendentes = financialEntries.filter((f) => f.status === 'pendente' || f.status === 'vencido')
  const contasPendentesValor = contasPendentes.reduce((s, f) => s + f.amount, 0)

  const leadsAbertos = leads.filter((l) => l.status !== 'fechado' && l.status !== 'perdido')
  const propostasEnviadas = leads.filter((l) => l.status === 'proposta_enviada')
  const followUpsPendentes = leads.filter((l) => l.followUpDate && l.status !== 'fechado' && l.status !== 'perdido')
  const negociacoesAndamento = leads.filter((l) => ['diagnostico', 'proposta_enviada', 'follow_up'].includes(l.status))

  const clientesAtivos = clients.filter((c) => c.status === 'ativo')
  const clientesAtencao = clients.filter((c) => c.status === 'em_atencao')
  const clientesRisco = clients.filter((c) => c.status === 'em_risco')
  const proximasReunioes = events.filter((e) => e.type === 'reuniao' && e.date >= todayIso)

  const projetosAtivos = projects.filter((p) => p.status === 'em_andamento')
  const tarefasAbertas = tasks.filter((t) => !['concluido', 'publicado'].includes(t.status))
  const tarefasAtrasadas = tasks.filter((t) => isOverdue(t.dueDate, ['concluido', 'publicado'].includes(t.status)))
  const daqui7dias = addDaysIso(7)
  const entregasSemana = events.filter((e) => ['entrega', 'publicacao'].includes(e.type) && e.date >= todayIso && e.date <= daqui7dias)

  const conteudosProducao = contentItems.filter((c) => c.status === 'em_producao')
  const reelsPendentes = contentItems.filter((c) => c.format === 'reel' && c.status !== 'publicado')
  const carrosseisPendentes = contentItems.filter((c) => c.format === 'carrossel' && c.status !== 'publicado')
  const aprovacoesInternas = contentItems.filter((c) => c.status === 'em_revisao_interna')
  const aprovacoesCliente = contentItems.filter((c) => c.status === 'aguardando_cliente')
  const tarefasCriativasAtrasadas = tasks.filter(
    (t) => t.area === 'criativo' && isOverdue(t.dueDate, ['concluido', 'publicado'].includes(t.status)),
  )

  const calReunioes = events.filter((e) => e.type === 'reuniao' && e.date >= todayIso)
  const calPrazos = events.filter((e) => e.type === 'tarefa' && e.date >= todayIso)
  const calPublicacoes = events.filter((e) => e.type === 'publicacao' && e.date >= todayIso)
  const calVencimentos = events.filter((e) => e.type === 'vencimento')

  const showFinanceiro = ['card_receita_prevista', 'card_receita_recebida', 'card_contas_pendentes', 'card_despesas', 'card_lucro_estimado'].some(visible)
  const showComercial = ['card_leads_abertos', 'card_propostas_enviadas', 'card_followups_pendentes', 'card_negociacoes_andamento'].some(visible)
  const showClientes = ['card_clientes_ativos', 'card_clientes_atencao', 'card_clientes_risco', 'card_proximas_reunioes'].some(visible)
  const showOperacao = ['card_projetos_ativos', 'card_tarefas_abertas', 'card_tarefas_atrasadas', 'card_entregas_semana'].some(visible)
  const showCriativo = [
    'card_conteudos_producao',
    'card_reels_pendentes',
    'card_carrosseis_pendentes',
    'card_aprovacoes_internas',
    'card_aprovacoes_cliente',
    'card_tarefas_criativas_atrasadas',
  ].some(visible)
  const showCalendario = ['card_cal_reunioes', 'card_cal_prazos', 'card_cal_publicacoes', 'card_cal_vencimentos'].some(visible)
  const showNada = !showFinanceiro && !showComercial && !showClientes && !showOperacao && !showCriativo && !showCalendario

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-iter-faint">Base Geral</p>
          <h1 className="mt-1 text-xl font-semibold text-iter-text sm:text-2xl">{appSettings.dashboardSlogan}</h1>
        </div>
        {canViewArea(user, 'geral:relatorios') && (
          <Button variant="secondary" icon={<FileBarChart2 className="h-4 w-4" />} onClick={() => navigate('/geral/relatorios')}>
            Exportar relatório
          </Button>
        )}
      </div>

      {showFinanceiro && (
        <section>
          <SectionHeader title="Financeiro" description="Visão consolidada de receitas e despesas do mês." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible('card_receita_prevista') && (
              <StatCard label="Receita prevista" value={formatCurrency(receitaPrevista)} icon={TrendingUp} tone="primary" hint="este mês" />
            )}
            {visible('card_receita_recebida') && (
              <StatCard label="Receita recebida" value={formatCurrency(receitaRecebida)} icon={Wallet} tone="success" hint="este mês" />
            )}
            {visible('card_despesas') && (
              <StatCard label="Despesas" value={formatCurrency(despesasMes)} icon={Receipt} tone="danger" hint="este mês" />
            )}
            {visible('card_lucro_estimado') && (
              <StatCard
                label="Lucro estimado"
                value={formatCurrency(lucroEstimado)}
                icon={PiggyBank}
                tone={lucroEstimado >= 0 ? 'success' : 'danger'}
                hint="este mês"
              />
            )}
            {visible('card_contas_pendentes') && (
              <StatCard
                label="Contas pendentes"
                value={formatCurrency(contasPendentesValor)}
                icon={AlertTriangle}
                tone="warning"
                hint={`${contasPendentes.length} conta(s)`}
              />
            )}
          </div>
        </section>
      )}

      {showComercial && (
        <section>
          <SectionHeader title="Comercial" description="Funil de vendas em andamento." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible('card_leads_abertos') && <StatCard label="Leads abertos" value={String(leadsAbertos.length)} icon={Users} />}
            {visible('card_propostas_enviadas') && (
              <StatCard label="Propostas enviadas" value={String(propostasEnviadas.length)} icon={FileBarChart2} />
            )}
            {visible('card_followups_pendentes') && (
              <StatCard label="Follow-ups pendentes" value={String(followUpsPendentes.length)} icon={Clock} tone="warning" />
            )}
            {visible('card_negociacoes_andamento') && (
              <StatCard label="Negociações em andamento" value={String(negociacoesAndamento.length)} icon={Handshake} tone="primary" />
            )}
          </div>
        </section>
      )}

      {showClientes && (
        <section>
          <SectionHeader title="Clientes" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible('card_clientes_ativos') && (
              <StatCard label="Clientes ativos" value={String(clientesAtivos.length)} icon={CheckCircle2} tone="success" />
            )}
            {visible('card_clientes_atencao') && (
              <StatCard label="Clientes em atenção" value={String(clientesAtencao.length)} icon={AlertTriangle} tone="warning" />
            )}
            {visible('card_clientes_risco') && (
              <StatCard label="Clientes em risco" value={String(clientesRisco.length)} icon={AlertTriangle} tone="danger" />
            )}
            {visible('card_proximas_reunioes') && (
              <StatCard label="Próximas reuniões" value={String(proximasReunioes.length)} icon={CalendarClock} />
            )}
          </div>
        </section>
      )}

      {showOperacao && (
        <section>
          <SectionHeader title="Operação" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible('card_projetos_ativos') && <StatCard label="Projetos ativos" value={String(projetosAtivos.length)} icon={Layers} />}
            {visible('card_tarefas_abertas') && <StatCard label="Tarefas abertas" value={String(tarefasAbertas.length)} icon={ListTodo} />}
            {visible('card_tarefas_atrasadas') && (
              <StatCard
                label="Tarefas atrasadas"
                value={String(tarefasAtrasadas.length)}
                icon={AlertTriangle}
                tone={tarefasAtrasadas.length > 0 ? 'danger' : 'default'}
              />
            )}
            {visible('card_entregas_semana') && (
              <StatCard label="Entregas da semana" value={String(entregasSemana.length)} icon={TrendingUp} tone="success" />
            )}
          </div>
        </section>
      )}

      {showCriativo && (
        <section>
          <SectionHeader title="Criativo" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible('card_conteudos_producao') && (
              <StatCard label="Conteúdos em produção" value={String(conteudosProducao.length)} icon={Sparkles} />
            )}
            {visible('card_reels_pendentes') && <StatCard label="Reels pendentes" value={String(reelsPendentes.length)} icon={Image} />}
            {visible('card_carrosseis_pendentes') && (
              <StatCard label="Carrosséis pendentes" value={String(carrosseisPendentes.length)} icon={Layers} />
            )}
            {visible('card_aprovacoes_internas') && (
              <StatCard label="Aprovações internas" value={String(aprovacoesInternas.length)} icon={CheckCircle2} tone="warning" />
            )}
            {visible('card_aprovacoes_cliente') && (
              <StatCard label="Aprovações do cliente" value={String(aprovacoesCliente.length)} icon={CheckCircle2} tone="warning" />
            )}
            {visible('card_tarefas_criativas_atrasadas') && (
              <StatCard
                label="Tarefas criativas atrasadas"
                value={String(tarefasCriativasAtrasadas.length)}
                icon={AlertTriangle}
                tone={tarefasCriativasAtrasadas.length > 0 ? 'danger' : 'default'}
              />
            )}
          </div>
        </section>
      )}

      {showCalendario && (
        <section>
          <SectionHeader
            title="Calendário"
            description="Próximos compromissos consolidados."
            action={
              canViewArea(user, 'geral:calendario') && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/geral/calendario')}>
                  Ver calendário completo →
                </Button>
              )
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible('card_cal_reunioes') && <StatCard label="Reuniões" value={String(calReunioes.length)} icon={CalendarDays} />}
            {visible('card_cal_prazos') && <StatCard label="Prazos" value={String(calPrazos.length)} icon={Clock} />}
            {visible('card_cal_publicacoes') && <StatCard label="Publicações" value={String(calPublicacoes.length)} icon={TrendingUp} />}
            {visible('card_cal_vencimentos') && (
              <StatCard label="Vencimentos" value={String(calVencimentos.length)} icon={Banknote} tone="warning" />
            )}
          </div>
        </section>
      )}

      {showNada && (
        <EmptyState title="Nenhum indicador liberado" description="Fale com um administrador para revisar suas permissões de visualização." />
      )}
    </div>
  )
}
