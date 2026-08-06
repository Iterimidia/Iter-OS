import { useDataStore } from '@/data/store'
import { useCurrentUser } from '@/features/auth/useAuth'
import type { ReportDefinition } from '@/types'
import {
  CLIENT_STATUS_META,
  DEMAND_STATUS_META,
  FINANCIAL_STATUS_META,
  formatClientBilling,
  formatCurrency,
  formatDate,
  isOverdue,
  isThisMonth,
  PRIORITY_META,
  PROJECT_STATUS_META,
  ROLE_LABELS,
  TASK_STATUS_META,
} from '@/lib/utils'
import { PrintCover, PrintSection, PrintStat, PrintTable } from '@/components/reports/PrintPrimitives'

const INDICATOR_SETS: Record<string, string[]> = {
  rep_dashboard_geral: ['clientesAtivos', 'projetosAndamento', 'tarefasAtrasadas', 'receitaMes', 'despesaMes', 'leadsAbertos'],
  rep_dashboard_operacional: ['clientesAtivos', 'projetosAndamento', 'tarefasAbertas', 'leadsAbertos'],
  rep_dashboard_criativo: ['conteudosProducao', 'tarefasAbertas', 'tarefasAtrasadas'],
  rep_financeiro: ['receitaMes', 'despesaMes'],
  rep_conteudo: ['conteudosProducao'],
  rep_tarefas: ['tarefasAbertas', 'tarefasAtrasadas'],
}

export function PrintableReport({ report }: { report: ReportDefinition }) {
  const user = useCurrentUser()!
  const clients = useDataStore((s) => s.clients)
  const projects = useDataStore((s) => s.projects)
  const tasks = useDataStore((s) => s.tasks)
  const leads = useDataStore((s) => s.leads)
  const financialEntries = useDataStore((s) => s.financialEntries)
  const contentItems = useDataStore((s) => s.contentItems)
  const appSettings = useDataStore((s) => s.appSettings)
  const users = useDataStore((s) => s.users)

  const clientesAtivos = clients.filter((c) => c.status === 'ativo')
  const clientesAtencao = clients.filter((c) => c.status === 'em_atencao')
  const clientesRisco = clients.filter((c) => c.status === 'em_risco')
  const projetosAndamento = projects.filter((p) => p.status === 'em_andamento')
  const tarefasAbertas = tasks.filter((t) => !['concluido', 'publicado'].includes(t.status))
  const tarefasAtrasadas = tasks.filter((t) => isOverdue(t.dueDate, ['concluido', 'publicado'].includes(t.status)))
  const receitaMes = financialEntries.filter((f) => f.type === 'receita' && isThisMonth(f.dueDate)).reduce((s, f) => s + f.amount, 0)
  const despesaMes = financialEntries.filter((f) => f.type === 'despesa' && isThisMonth(f.dueDate)).reduce((s, f) => s + f.amount, 0)
  const leadsAbertos = leads.filter((l) => !['fechado', 'perdido'].includes(l.status))
  const conteudosProducao = contentItems.filter((c) => c.status === 'em_producao')

  const indicatorsMap: Record<string, { label: string; value: string }> = {
    clientesAtivos: { label: 'Clientes ativos', value: String(clientesAtivos.length) },
    projetosAndamento: { label: 'Projetos em andamento', value: String(projetosAndamento.length) },
    tarefasAbertas: { label: 'Tarefas abertas', value: String(tarefasAbertas.length) },
    tarefasAtrasadas: { label: 'Tarefas atrasadas', value: String(tarefasAtrasadas.length) },
    receitaMes: { label: 'Receita prevista (mês)', value: formatCurrency(receitaMes) },
    despesaMes: { label: 'Despesas (mês)', value: formatCurrency(despesaMes) },
    leadsAbertos: { label: 'Leads em aberto', value: String(leadsAbertos.length) },
    conteudosProducao: { label: 'Conteúdos em produção', value: String(conteudosProducao.length) },
  }

  const indicators = (INDICATOR_SETS[report.id] ?? []).map((key) => indicatorsMap[key])
  const responsavel = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  return (
    <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-gray-900 shadow-sm print:shadow-none">
      <PrintCover
        company={appSettings.companyName}
        title={report.title}
        subtitle={report.description}
        authorName={user.name}
        authorRole={ROLE_LABELS[user.role]}
      />

      <PrintSection title="Resumo Executivo">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            {clientesAtivos.length} cliente(s) ativo(s), {clientesAtencao.length} em atenção e {clientesRisco.length} em risco.
          </li>
          <li>{projetosAndamento.length} projeto(s) em andamento.</li>
          <li>
            {tarefasAbertas.length} tarefa(s) em aberto, sendo {tarefasAtrasadas.length} atrasada(s).
          </li>
          {(report.id === 'rep_dashboard_geral' || report.id === 'rep_financeiro') && (
            <li>
              Receita prevista de {formatCurrency(receitaMes)} e despesas de {formatCurrency(despesaMes)} neste mês.
            </li>
          )}
          {(report.id === 'rep_dashboard_geral' || report.id === 'rep_dashboard_operacional') && (
            <li>{leadsAbertos.length} lead(s) em aberto no funil comercial.</li>
          )}
        </ul>
      </PrintSection>

      {indicators.length > 0 && (
        <PrintSection title="Indicadores Principais">
          <div className="grid grid-cols-3 gap-4">
            {indicators.map((ind) => (
              <PrintStat key={ind.label} label={ind.label} value={ind.value} />
            ))}
          </div>
        </PrintSection>
      )}

      {['rep_dashboard_geral', 'rep_dashboard_operacional'].includes(report.id) && (
        <PrintSection title="Clientes Ativos">
          <PrintTable
            headers={['Cliente', 'Status', 'Plano', 'Valor mensal', 'Responsável estratégico']}
            rows={clients.map((c) => [
              c.name,
              CLIENT_STATUS_META[c.status].label,
              c.plan,
              formatClientBilling(c),
              responsavel(c.strategicResponsibleId),
            ])}
          />
        </PrintSection>
      )}

      {['rep_dashboard_geral', 'rep_dashboard_operacional'].includes(report.id) && (
        <PrintSection title="Projetos em Andamento">
          <PrintTable
            headers={['Projeto', 'Cliente', 'Status', 'Prazo final']}
            rows={projetosAndamento.map((p) => [
              p.title,
              clients.find((c) => c.id === p.clientId)?.name ?? '—',
              PROJECT_STATUS_META[p.status].label,
              formatDate(p.endDate),
            ])}
          />
        </PrintSection>
      )}

      {['rep_dashboard_geral', 'rep_dashboard_operacional', 'rep_tarefas'].includes(report.id) && (
        <PrintSection title="Tarefas e Prazos">
          <PrintTable
            headers={['Tarefa', 'Responsável', 'Prazo', 'Status', 'Prioridade']}
            rows={tasks
              .slice()
              .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
              .map((t) => [
                t.title,
                responsavel(t.responsibleId),
                t.dueDate ? formatDate(t.dueDate) : '—',
                TASK_STATUS_META[t.status].label,
                PRIORITY_META[t.priority].label,
              ])}
          />
        </PrintSection>
      )}

      {['rep_dashboard_criativo', 'rep_conteudo'].includes(report.id) && (
        <PrintSection title="Conteúdo em Produção">
          <PrintTable
            headers={['Título', 'Cliente', 'Formato', 'Status', 'Prazo']}
            rows={contentItems.map((c) => [
              c.title,
              clients.find((cl) => cl.id === c.clientId)?.name ?? '—',
              c.format,
              DEMAND_STATUS_META[c.status].label,
              c.dueDate ? formatDate(c.dueDate) : '—',
            ])}
          />
        </PrintSection>
      )}

      {['rep_dashboard_geral', 'rep_financeiro'].includes(report.id) && (
        <PrintSection title="Financeiro Resumido">
          <PrintTable
            headers={['Descrição', 'Cliente', 'Tipo', 'Valor', 'Vencimento', 'Status']}
            rows={financialEntries.map((f) => [
              f.description,
              clients.find((c) => c.id === f.clientId)?.name ?? '—',
              f.type === 'receita' ? 'Receita' : 'Despesa',
              formatCurrency(f.amount),
              formatDate(f.dueDate),
              FINANCIAL_STATUS_META[f.status].label,
            ])}
          />
        </PrintSection>
      )}

      {report.id === 'rep_dashboard_geral' && (
        <PrintSection title="Gargalos">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
            {clientesRisco.length > 0 && <li>{clientesRisco.map((c) => c.name).join(', ')} em risco — priorizar contato imediato.</li>}
            {tarefasAtrasadas.length > 0 && <li>{tarefasAtrasadas.length} tarefa(s) atrasada(s) precisam de atenção.</li>}
            {clientesRisco.length === 0 && tarefasAtrasadas.length === 0 && <li>Nenhum gargalo crítico identificado no momento.</li>}
          </ul>
        </PrintSection>
      )}

      {report.id === 'rep_dashboard_geral' && (
        <PrintSection title="Próximas Ações">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
            {clients.filter((c) => c.pendencies).length === 0 && <li>Nenhuma pendência crítica registrada.</li>}
            {clients
              .filter((c) => c.pendencies)
              .map((c) => (
                <li key={c.id}>
                  {c.name}: {c.pendencies}
                </li>
              ))}
          </ul>
        </PrintSection>
      )}

      <PrintSection title="Observações">
        <p className="text-sm text-gray-500">Relatório gerado automaticamente pelo Iter OS a partir dos dados registrados no sistema.</p>
      </PrintSection>
    </div>
  )
}
