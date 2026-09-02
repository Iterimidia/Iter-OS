import { useState } from 'react'
import { AlertTriangle, Banknote, PiggyBank, Pencil, Plus, Receipt, Search, ShieldAlert, Trash2, TrendingUp, Wallet } from 'lucide-react'
import type { FinancialEntry, FinancialStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { addDaysIso, FINANCIAL_STATUS_META, formatCurrency, formatDate, isThisMonth } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { StatusSelect } from '@/components/ui/StatusSelect'
import { DataTable } from '@/components/tables/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FinancialEntryFormModal } from '@/features/operational/FinancialEntryFormModal'

const STATUS_OPTIONS: { value: FinancialStatus; label: string }[] = (['previsto', 'pendente', 'pago', 'vencido'] as FinancialStatus[]).map((s) => ({
  value: s,
  label: FINANCIAL_STATUS_META[s].label,
}))

export function FinancePage() {
  const user = useCurrentUser()!
  const financialEntries = useDataStore((s) => s.financialEntries)
  const clients = useDataStore((s) => s.clients)
  const updateFinancialEntry = useDataStore((s) => s.updateFinancialEntry)
  const removeFinancialEntry = useDataStore((s) => s.removeFinancialEntry)

  const [tab, setTab] = useState('resumo')
  const [modalType, setModalType] = useState<'receita' | 'despesa' | null>(null)
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('all')

  if (!canPerformAction(user, 'ver_financeiro')) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Sem permissão para ver o financeiro"
        description="Fale com um administrador se você acredita que deveria ter acesso."
      />
    )
  }

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name ?? '—'

  const receitas = financialEntries.filter((f) => f.type === 'receita')
  const despesas = financialEntries.filter((f) => f.type === 'despesa')
  const pendencias = financialEntries.filter((f) => f.status === 'pendente' || f.status === 'vencido')

  const receitaPrevista = receitas.filter((f) => isThisMonth(f.dueDate)).reduce((s, f) => s + f.amount, 0)
  const receitaRecebida = receitas.filter((f) => f.status === 'pago' && isThisMonth(f.paidDate ?? f.dueDate)).reduce((s, f) => s + f.amount, 0)
  const despesasMes = despesas.filter((f) => isThisMonth(f.dueDate)).reduce((s, f) => s + f.amount, 0)
  const lucroEstimado = receitaPrevista - despesasMes
  const vencidas = financialEntries.filter((f) => f.status === 'vencido')
  const proximos14 = addDaysIso(14)
  const aVencer = financialEntries.filter((f) => (f.status === 'previsto' || f.status === 'pendente') && f.dueDate <= proximos14)
  const receitasComCliente = receitas.filter((f) => f.clientId && isThisMonth(f.dueDate))
  const ticketMedio = receitasComCliente.length > 0 ? receitasComCliente.reduce((s, f) => s + f.amount, 0) / receitasComCliente.length : 0
  const receitaRecorrente = receitas.filter((f) => f.recurring && isThisMonth(f.dueDate)).reduce((s, f) => s + f.amount, 0)

  const clientesPendentes = clients
    .map((c) => ({
      client: c,
      total: financialEntries.filter((f) => f.clientId === c.id && (f.status === 'pendente' || f.status === 'vencido')).reduce((s, f) => s + f.amount, 0),
      count: financialEntries.filter((f) => f.clientId === c.id && (f.status === 'pendente' || f.status === 'vencido')).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total)

  const canCreate = canPerformAction(user, 'criar')
  const canEditEntry = canPerformAction(user, 'editar')
  const canDelete = canPerformAction(user, 'excluir')

  function matchesFilters(f: FinancialEntry) {
    if (clientFilter !== 'all' && f.clientId !== clientFilter) return false
    if (query && !f.description.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }

  function statusColumn(entry: FinancialEntry) {
    return (
      <StatusSelect
        value={entry.status}
        onChange={(status) => updateFinancialEntry(entry.id, { status })}
        disabled={!canEditEntry}
        options={STATUS_OPTIONS}
      />
    )
  }

  function handleDeleteEntry(entry: FinancialEntry) {
    if (window.confirm(`Excluir o lançamento "${entry.description}"?`)) {
      removeFinancialEntry(entry.id)
    }
  }

  function actionsColumn(entry: FinancialEntry) {
    return (
      <div className="flex items-center gap-1">
        {canEditEntry && (
          <button
            onClick={() => setEditingEntry(entry)}
            className="focus-ring rounded-md p-1 text-iter-faint hover:text-iter-text"
            aria-label="Editar lançamento"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {canDelete && (
          <button onClick={() => handleDeleteEntry(entry)} className="focus-ring rounded-md p-1 text-iter-faint hover:text-iter-danger" aria-label="Excluir lançamento">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title="Financeiro" description="Financeiro gerencial simples — não substitui contabilidade." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receita prevista" value={formatCurrency(receitaPrevista)} icon={TrendingUp} tone="primary" hint="este mês" />
        <StatCard label="Receita recebida" value={formatCurrency(receitaRecebida)} icon={Wallet} tone="success" hint="este mês" />
        <StatCard label="Despesas" value={formatCurrency(despesasMes)} icon={Receipt} tone="danger" hint="este mês" />
        <StatCard label="Lucro estimado" value={formatCurrency(lucroEstimado)} icon={PiggyBank} tone={lucroEstimado >= 0 ? 'success' : 'danger'} hint="este mês" />
        <StatCard label="Contas vencidas" value={String(vencidas.length)} icon={AlertTriangle} tone={vencidas.length > 0 ? 'danger' : 'default'} />
        <StatCard label="Contas a vencer" value={String(aVencer.length)} icon={Banknote} tone="warning" hint="próximos 14 dias" />
        <StatCard label="Ticket médio" value={formatCurrency(ticketMedio)} icon={TrendingUp} hint="por cliente/mês" />
        <StatCard label="Receita recorrente" value={formatCurrency(receitaRecorrente)} icon={Wallet} tone="primary" hint="MRR" />
      </div>

      <Tabs
        className="mb-5 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'resumo', label: 'Resumo' },
          { id: 'receitas', label: 'Receitas', count: receitas.length },
          { id: 'despesas', label: 'Despesas', count: despesas.length },
          { id: 'pendencias', label: 'Pendências', count: pendencias.length },
        ]}
      />

      {tab !== 'resumo' && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
            <Input placeholder="Buscar por descrição..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="sm:w-56">
            <option value="all">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {tab === 'resumo' && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-iter-faint">Clientes Pendentes</h3>
          {clientesPendentes.length === 0 ? (
            <EmptyState title="Nenhuma pendência" description="Todos os clientes estão em dia." />
          ) : (
            <div className="space-y-2">
              {clientesPendentes.map(({ client, total, count }) => (
                <div key={client.id} className="card-surface flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-iter-text">{client.name}</p>
                    <p className="text-xs text-iter-faint">{count} conta(s) em aberto</p>
                  </div>
                  <span className="text-sm font-semibold text-iter-warning">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'receitas' && (
        <>
          {canCreate && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setModalType('receita')}>
                Nova receita
              </Button>
            </div>
          )}
          <DataTable
            data={receitas.filter(matchesFilters)}
            keyField={(f) => f.id}
            emptyTitle="Nenhuma receita encontrada"
            columns={[
              { key: 'descricao', header: 'Descrição', render: (f) => f.description },
              { key: 'cliente', header: 'Cliente', render: (f) => clientName(f.clientId) },
              { key: 'valor', header: 'Valor', render: (f) => formatCurrency(f.amount) },
              { key: 'vencimento', header: 'Vencimento', render: (f) => formatDate(f.dueDate) },
              { key: 'status', header: 'Status', render: statusColumn },
              { key: 'acoes', header: '', render: actionsColumn },
            ]}
          />
        </>
      )}

      {tab === 'despesas' && (
        <>
          {canCreate && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setModalType('despesa')}>
                Nova despesa
              </Button>
            </div>
          )}
          <DataTable
            data={despesas.filter(matchesFilters)}
            keyField={(f) => f.id}
            emptyTitle="Nenhuma despesa encontrada"
            columns={[
              { key: 'descricao', header: 'Descrição', render: (f) => f.description },
              { key: 'categoria', header: 'Categoria', render: (f) => f.category },
              { key: 'valor', header: 'Valor', render: (f) => formatCurrency(f.amount) },
              { key: 'vencimento', header: 'Vencimento', render: (f) => formatDate(f.dueDate) },
              { key: 'status', header: 'Status', render: statusColumn },
              { key: 'acoes', header: '', render: actionsColumn },
            ]}
          />
        </>
      )}

      {tab === 'pendencias' && (
        <DataTable
          data={pendencias.filter(matchesFilters)}
          keyField={(f) => f.id}
          emptyTitle="Nenhuma pendência encontrada"
          columns={[
            { key: 'descricao', header: 'Descrição', render: (f) => f.description },
            { key: 'tipo', header: 'Tipo', render: (f) => <Badge tone="neutral">{f.type === 'receita' ? 'Receita' : 'Despesa'}</Badge> },
            { key: 'cliente', header: 'Cliente', render: (f) => clientName(f.clientId) },
            { key: 'valor', header: 'Valor', render: (f) => formatCurrency(f.amount) },
            { key: 'vencimento', header: 'Vencimento', render: (f) => formatDate(f.dueDate) },
            { key: 'status', header: 'Status', render: statusColumn },
            { key: 'acoes', header: '', render: actionsColumn },
          ]}
        />
      )}

      <FinancialEntryFormModal
        open={modalType !== null || editingEntry !== null}
        onClose={() => {
          setModalType(null)
          setEditingEntry(null)
        }}
        type={editingEntry?.type ?? modalType ?? 'receita'}
        entry={editingEntry ?? undefined}
      />
    </div>
  )
}
