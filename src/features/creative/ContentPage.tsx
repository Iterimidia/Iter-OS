import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import type { ContentChannel, ContentFormat, ContentItem } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, getAccessibleClients } from '@/lib/permissions'
import {
  CONTENT_CHANNEL_LABELS,
  CONTENT_CHANNEL_ORDER,
  CONTENT_FORMAT_LABELS,
  CONTENT_FORMAT_ORDER,
  CONTENT_STATUS_META,
  CONTENT_STATUS_ORDER,
} from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContentCard } from '@/components/cards/ContentCard'
import { ContentMonthList } from '@/components/content/ContentMonthList'
import { KanbanBoard } from '@/components/tables/KanbanBoard'
import { ContentQuickCreateModal } from '@/features/creative/ContentQuickCreateModal'

const KANBAN_COLUMNS = CONTENT_STATUS_ORDER.map((id) => ({ id, label: CONTENT_STATUS_META[id].label }))

/**
 * Tela única de Conteúdo (Conteúdo 2.0) — substitui as antigas Conteúdo /
 * Demandas / Aprovações, que eram 3 páginas sobre a mesma entidade. Modo
 * "Por mês" é o padrão (spec §2: mês atual + próximos, sem misturar toda a
 * produção); Kanban fica como modo de visualização alternativo, não área
 * própria (decisão explícita).
 */
export function ContentPage() {
  const user = useCurrentUser()!
  const contentItems = useDataStore((s) => s.contentItems)
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const updateContentItem = useDataStore((s) => s.updateContentItem)
  const removeContentItem = useDataStore((s) => s.removeContentItem)
  const navigate = useNavigate()

  const [view, setView] = useState<'mes' | 'kanban'>('mes')
  const [clientFilter, setClientFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState<'all' | ContentFormat>('all')
  const [channelFilter, setChannelFilter] = useState<'all' | ContentChannel>('all')
  const [query, setQuery] = useState('')
  const [monthsAhead, setMonthsAhead] = useState(2)
  const [createOpen, setCreateOpen] = useState(false)

  const accessibleIds = new Set(getAccessibleClients(user, clients).map((c) => c.id))
  const visible = contentItems.filter((c) => accessibleIds.has(c.clientId))

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name
  const executorName = (id?: string) => (id ? (users.find((u) => u.id === id)?.name ?? '—') : undefined)
  const canCreate = canPerformAction(user, 'criar')
  const canEditContent = canPerformAction(user, 'editar')
  const canDelete = canPerformAction(user, 'excluir')

  const filtered = visible.filter(
    (c) =>
      (clientFilter === 'all' || c.clientId === clientFilter) &&
      (formatFilter === 'all' || c.format === formatFilter) &&
      (channelFilter === 'all' || c.channels?.includes(channelFilter)) &&
      c.title.toLowerCase().includes(query.toLowerCase()),
  )

  function handleDelete(item: { id: string; title: string }) {
    if (window.confirm(`Excluir a peça "${item.title}"?`)) {
      removeContentItem(item.id)
    }
  }

  function renderCard(item: ContentItem) {
    return (
      <ContentCard
        key={item.id}
        item={item}
        clientName={clientName(item.clientId)}
        executorName={executorName(item.executorId)}
        canChangeStatus={canEditContent}
        onStatusChange={(status) => updateContentItem(item.id, { status })}
        onOpen={() => navigate(`/criativo/conteudo/${item.id}`)}
        onDelete={canDelete ? () => handleDelete(item) : undefined}
      />
    )
  }

  return (
    <div>
      <SectionHeader
        title="Conteúdo"
        description="Calendário editorial — do planejamento à publicação, por cliente."
        action={
          canCreate && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              Nova peça
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
          <Input placeholder="Buscar peça..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select className="h-10 w-auto" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="all">Todos os clientes</option>
          {clients
            .filter((c) => accessibleIds.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
        <Select className="h-10 w-auto" value={formatFilter} onChange={(e) => setFormatFilter(e.target.value as 'all' | ContentFormat)}>
          <option value="all">Todos os formatos</option>
          {CONTENT_FORMAT_ORDER.map((f) => (
            <option key={f} value={f}>
              {CONTENT_FORMAT_LABELS[f]}
            </option>
          ))}
        </Select>
        <Select className="h-10 w-auto" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as 'all' | ContentChannel)}>
          <option value="all">Todos os canais</option>
          {CONTENT_CHANNEL_ORDER.map((ch) => (
            <option key={ch} value={ch}>
              {CONTENT_CHANNEL_LABELS[ch]}
            </option>
          ))}
        </Select>
        <Tabs
          className="ml-auto w-fit"
          active={view}
          onChange={(id) => setView(id as 'mes' | 'kanban')}
          tabs={[
            { id: 'mes', label: 'Por mês' },
            { id: 'kanban', label: 'Kanban' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma peça encontrada" description="Ajuste os filtros ou crie uma nova peça de conteúdo." />
      ) : view === 'kanban' ? (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={filtered}
          getId={(i) => i.id}
          getStatus={(i) => i.status}
          onStatusChange={(item, status) => updateContentItem(item.id, { status })}
          canChangeStatus={canEditContent}
          renderCard={renderCard}
        />
      ) : (
        <ContentMonthList
          items={filtered}
          clients={clients}
          users={users}
          monthsAhead={monthsAhead}
          onExpand={() => setMonthsAhead((n) => n + 1)}
          canChangeStatus={canEditContent}
          onStatusChange={(item, status) => updateContentItem(item.id, { status })}
          onOpen={(item) => navigate(`/criativo/conteudo/${item.id}`)}
          onDelete={canDelete ? handleDelete : undefined}
        />
      )}

      <ContentQuickCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => navigate(`/criativo/conteudo/${id}`)} />
    </div>
  )
}
