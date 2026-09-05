import { useDataStore } from '@/data/store'
import { useCurrentUser } from '@/features/auth/useAuth'
import {
  CLIENT_STATUS_META,
  DEMAND_STATUS_META,
  FINANCIAL_STATUS_META,
  formatClientBilling,
  formatCurrency,
  formatDate,
  PROJECT_STATUS_META,
  ROLE_LABELS,
  TASK_STATUS_META,
} from '@/lib/utils'
import { PrintCover, PrintSection, PrintStat, PrintTable } from '@/components/reports/PrintPrimitives'

export function PrintableClientReport({ clientId }: { clientId: string }) {
  const user = useCurrentUser()!
  const client = useDataStore((s) => s.clients.find((c) => c.id === clientId))
  const projects = useDataStore((s) => s.projects.filter((p) => p.clientId === clientId))
  const tasks = useDataStore((s) => s.tasks.filter((t) => t.clientId === clientId))
  const contentItems = useDataStore((s) => s.contentItems.filter((c) => c.clientId === clientId))
  const financialEntries = useDataStore((s) => s.financialEntries.filter((f) => f.clientId === clientId))
  const files = useDataStore((s) => s.files.filter((f) => f.clientId === clientId))
  const users = useDataStore((s) => s.users)
  const appSettings = useDataStore((s) => s.appSettings)

  if (!client) {
    return <p className="p-10 text-center text-sm text-gray-500">Cliente não encontrado.</p>
  }

  const responsavel = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  return (
    <div className="mx-auto max-w-3xl bg-white px-10 py-12 text-gray-900 shadow-sm print:shadow-none">
      <PrintCover
        company={appSettings.companyName}
        title={`Relatório do Cliente — ${client.name}`}
        subtitle={client.segment}
        authorName={user.name}
        authorRole={ROLE_LABELS[user.role]}
      />

      <PrintSection title="Visão Geral">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <PrintStat label="Status" value={CLIENT_STATUS_META[client.status].label} />
          <PrintStat label="Plano" value={client.plan} />
          <PrintStat label={client.billingType === 'percentual' ? 'Comissão' : 'Valor mensal'} value={formatClientBilling(client)} />
          <PrintStat label="Responsável estratégico" value={responsavel(client.strategicResponsibleId)} />
        </div>
        <p className="text-sm leading-relaxed text-gray-700">{client.briefing ?? 'Sem briefing registrado.'}</p>
        {client.pendencies && <p className="mt-2 text-sm leading-relaxed text-amber-700">Pendência: {client.pendencies}</p>}
      </PrintSection>

      <PrintSection title="Serviços Contratados">
        <p className="text-sm text-gray-700">{client.services.join(', ') || '—'}</p>
      </PrintSection>

      <PrintSection title="Projetos Vinculados">
        <PrintTable
          headers={['Projeto', 'Status', 'Prazo final']}
          rows={projects.map((p) => [p.title, PROJECT_STATUS_META[p.status].label, p.endDate ? formatDate(p.endDate) : '—'])}
        />
      </PrintSection>

      <PrintSection title="Tarefas Vinculadas">
        <PrintTable
          headers={['Tarefa', 'Status', 'Prazo']}
          rows={tasks.map((t) => [t.title, TASK_STATUS_META[t.status].label, t.dueDate ? formatDate(t.dueDate) : '—'])}
        />
      </PrintSection>

      <PrintSection title="Conteúdos Vinculados">
        <PrintTable
          headers={['Título', 'Formato', 'Status']}
          rows={contentItems.map((c) => [c.title, c.format, DEMAND_STATUS_META[c.status].label])}
        />
      </PrintSection>

      <PrintSection title="Financeiro do Cliente">
        <PrintTable
          headers={['Descrição', 'Valor', 'Vencimento', 'Status']}
          rows={financialEntries.map((f) => [f.description, formatCurrency(f.amount), formatDate(f.dueDate), FINANCIAL_STATUS_META[f.status].label])}
        />
      </PrintSection>

      <PrintSection title="Arquivos">
        <PrintTable headers={['Nome', 'Categoria']} rows={files.map((f) => [f.name, f.category])} />
      </PrintSection>

      <PrintSection title="Observações Estratégicas">
        <p className="text-sm text-gray-700">{client.notes ?? 'Sem observações registradas.'}</p>
      </PrintSection>
    </div>
  )
}
