import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Pencil, Trash2, TriangleAlert } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canAccessClient, canEdit as canEditResource, canExport, canPerformAction } from '@/lib/permissions'
import { mockReports } from '@/data/mockData'
import {
  CLIENT_STATUS_META,
  DEMAND_STATUS_META,
  FINANCIAL_STATUS_META,
  formatClientBilling,
  formatCurrency,
  formatDate,
  PROJECT_STATUS_META,
  TASK_STATUS_META,
} from '@/lib/utils'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable } from '@/components/tables/DataTable'
import { ClientFormModal } from '@/features/operational/ClientFormModal'

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const client = useDataStore((s) => s.clients.find((c) => c.id === clientId))
  const removeClient = useDataStore((s) => s.removeClient)
  const users = useDataStore((s) => s.users)
  const projects = useDataStore((s) => s.projects.filter((p) => p.clientId === clientId))
  const tasks = useDataStore((s) => s.tasks.filter((t) => t.clientId === clientId))
  const contentItems = useDataStore((s) => s.contentItems.filter((c) => c.clientId === clientId))
  const financialEntries = useDataStore((s) => s.financialEntries.filter((f) => f.clientId === clientId))
  const files = useDataStore((s) => s.files.filter((f) => f.clientId === clientId))

  const [tab, setTab] = useState('geral')
  const [editOpen, setEditOpen] = useState(false)

  if (!client || !clientId || !canAccessClient(user, clientId)) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Cliente não encontrado ou sem permissão"
        description="Volte para a lista de clientes."
        action={
          <Button variant="secondary" onClick={() => navigate('/operacional/clientes')}>
            Voltar
          </Button>
        }
      />
    )
  }

  const clientIdSafe = client.id
  const clientNameSafe = client.name
  const findUser = (id: string) => users.find((u) => u.id === id)
  const strategic = findUser(client.strategicResponsibleId)
  const creative = findUser(client.creativeResponsibleId)
  const canEditClient = canEditResource(user, { clientId: client.id })
  const canDeleteClient = canPerformAction(user, 'excluir')
  const canExportClient = canExport(user, mockReports.find((r) => r.id === 'rep_cliente')!)
  const canSeeFinance = canPerformAction(user, 'ver_financeiro')

  function handleDelete() {
    if (window.confirm(`Excluir "${clientNameSafe}"? Isso não apaga projetos, tarefas ou lançamentos já vinculados a ele.`)) {
      removeClient(clientIdSafe)
      navigate('/operacional/clientes')
    }
  }

  const tabs = [
    { id: 'geral', label: 'Visão Geral' },
    { id: 'projetos', label: 'Projetos', count: projects.length },
    { id: 'tarefas', label: 'Tarefas', count: tasks.length },
    { id: 'conteudo', label: 'Conteúdo', count: contentItems.length },
    ...(canSeeFinance ? [{ id: 'financeiro', label: 'Financeiro', count: financialEntries.length }] : []),
    { id: 'arquivos', label: 'Arquivos', count: files.length },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/operacional/clientes')}
        className="focus-ring mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-iter-muted hover:text-iter-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold text-iter-text">{client.name}</h1>
            <Badge tone={CLIENT_STATUS_META[client.status].tone}>{CLIENT_STATUS_META[client.status].label}</Badge>
            <Badge tone="neutral">{client.plan}</Badge>
          </div>
          <p className="mt-1 text-sm text-iter-muted">{client.segment}</p>
        </div>
        <div className="flex gap-2">
          {canExportClient && (
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => navigate(`/relatorios/imprimir/cliente/${client.id}`)}>
              Exportar
            </Button>
          )}
          {canEditClient && (
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Editar
            </Button>
          )}
          {canDeleteClient && (
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
              Excluir
            </Button>
          )}
        </div>
      </div>

      <Tabs className="mb-6 w-fit" tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'geral' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="card-surface p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-iter-faint">Briefing</h3>
              <p className="mt-2 text-sm leading-relaxed text-iter-text">{client.briefing || 'Sem briefing registrado.'}</p>
            </div>
            {client.pendencies && (
              <div className="rounded-2xl border border-iter-warning/25 bg-iter-warning/10 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-iter-warning">Pendências</h3>
                <p className="mt-2 text-sm leading-relaxed text-iter-text">{client.pendencies}</p>
              </div>
            )}
            {client.notes && (
              <div className="card-surface p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-iter-faint">Observações estratégicas</h3>
                <p className="mt-2 text-sm leading-relaxed text-iter-text">{client.notes}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="card-surface space-y-3 p-5">
              <InfoRow label={client.billingType === 'percentual' ? 'Comissão' : 'Valor mensal'}>
                <span className="font-semibold text-iter-success">{formatClientBilling(client)}</span>
              </InfoRow>
              <InfoRow label="Responsável estratégico">
                {strategic && (
                  <span className="flex items-center gap-2">
                    <Avatar name={strategic.name} initials={strategic.avatarInitials} color={strategic.avatarColor} size="sm" />
                    {strategic.name}
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Responsável criativo">
                {creative && (
                  <span className="flex items-center gap-2">
                    <Avatar name={creative.name} initials={creative.avatarInitials} color={creative.avatarColor} size="sm" />
                    {creative.name}
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Serviços">
                <div className="flex flex-wrap justify-end gap-1">
                  {client.services.length > 0 ? client.services.map((s) => <Badge key={s} tone="neutral">{s}</Badge>) : '—'}
                </div>
              </InfoRow>
              <InfoRow label="Próxima reunião">{client.nextMeetingAt ? formatDate(client.nextMeetingAt) : '—'}</InfoRow>
              {client.driveFolderUrl && (
                <InfoRow label="Pasta Drive">
                  <a
                    href={client.driveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-iter-accent hover:underline"
                  >
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                </InfoRow>
              )}
              <InfoRow label="Cliente desde">{formatDate(client.createdAt)}</InfoRow>
            </div>
          </div>
        </div>
      )}

      {tab === 'projetos' &&
        (projects.length === 0 ? (
          <EmptyState title="Nenhum projeto vinculado" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-iter-text">{p.title}</p>
                  <Badge tone={PROJECT_STATUS_META[p.status].tone}>{PROJECT_STATUS_META[p.status].label}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-iter-muted">{p.description}</p>
                <p className="mt-2 text-[11px] text-iter-faint">Prazo final: {formatDate(p.endDate)}</p>
              </div>
            ))}
          </div>
        ))}

      {tab === 'tarefas' && (
        <DataTable
          data={tasks}
          keyField={(t) => t.id}
          emptyTitle="Nenhuma tarefa vinculada"
          columns={[
            { key: 'titulo', header: 'Tarefa', render: (t) => t.title },
            {
              key: 'status',
              header: 'Status',
              render: (t) => <Badge tone={TASK_STATUS_META[t.status].tone}>{TASK_STATUS_META[t.status].label}</Badge>,
            },
            { key: 'prazo', header: 'Prazo', render: (t) => (t.dueDate ? formatDate(t.dueDate) : '—') },
          ]}
        />
      )}

      {tab === 'conteudo' && (
        <DataTable
          data={contentItems}
          keyField={(c) => c.id}
          emptyTitle="Nenhum conteúdo vinculado"
          columns={[
            { key: 'titulo', header: 'Título', render: (c) => c.title },
            { key: 'formato', header: 'Formato', render: (c) => <Badge tone="neutral">{c.format}</Badge> },
            {
              key: 'status',
              header: 'Status',
              render: (c) => <Badge tone={DEMAND_STATUS_META[c.status].tone}>{DEMAND_STATUS_META[c.status].label}</Badge>,
            },
          ]}
        />
      )}

      {tab === 'financeiro' && canSeeFinance && (
        <DataTable
          data={financialEntries}
          keyField={(f) => f.id}
          emptyTitle="Nenhum lançamento para este cliente"
          columns={[
            { key: 'descricao', header: 'Descrição', render: (f) => f.description },
            { key: 'tipo', header: 'Tipo', render: (f) => (f.type === 'receita' ? 'Receita' : 'Despesa') },
            { key: 'valor', header: 'Valor', render: (f) => formatCurrency(f.amount) },
            { key: 'vencimento', header: 'Vencimento', render: (f) => formatDate(f.dueDate) },
            {
              key: 'status',
              header: 'Status',
              render: (f) => <Badge tone={FINANCIAL_STATUS_META[f.status].tone}>{FINANCIAL_STATUS_META[f.status].label}</Badge>,
            },
          ]}
        />
      )}

      {tab === 'arquivos' &&
        (files.length === 0 ? (
          <EmptyState title="Nenhum arquivo vinculado" />
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="card-surface flex items-center justify-between p-3.5 transition-colors hover:border-iter-primary/40"
              >
                <div>
                  <p className="text-sm font-medium text-iter-text">{f.name}</p>
                  <p className="text-[11px] text-iter-faint">{f.category}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-iter-faint" />
              </a>
            ))}
          </div>
        ))}

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="pt-0.5 text-iter-faint">{label}</span>
      <span className="text-right font-medium text-iter-text">{children}</span>
    </div>
  )
}
