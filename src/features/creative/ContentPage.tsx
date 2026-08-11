import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { ContentFormat, ContentItem } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, getAccessibleClients } from '@/lib/permissions'
import { CONTENT_FORMAT_LABELS, CONTENT_FORMAT_ORDER } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContentCard } from '@/components/cards/ContentCard'
import { ContentFormModal } from '@/features/creative/ContentFormModal'

export function ContentPage() {
  const user = useCurrentUser()!
  const contentItems = useDataStore((s) => s.contentItems)
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const updateContentItem = useDataStore((s) => s.updateContentItem)
  const removeContentItem = useDataStore((s) => s.removeContentItem)

  const [format, setFormat] = useState<'all' | ContentFormat>('all')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)

  const accessibleIds = new Set(getAccessibleClients(user, clients).map((c) => c.id))
  const visible = contentItems.filter((c) => accessibleIds.has(c.clientId))
  const filtered = visible.filter((c) => (format === 'all' || c.format === format) && c.title.toLowerCase().includes(query.toLowerCase()))

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'
  const canApprove = canPerformAction(user, 'aprovar')
  const canDelete = canPerformAction(user, 'excluir')

  function handleDelete(item: { id: string; title: string }) {
    if (window.confirm(`Excluir a peça "${item.title}"?`)) {
      removeContentItem(item.id)
    }
  }

  const formatTabs = CONTENT_FORMAT_ORDER.map((f) => ({
    id: f,
    label: CONTENT_FORMAT_LABELS[f],
    count: visible.filter((c) => c.format === f).length,
  })).filter((t) => t.count > 0)

  return (
    <div>
      <SectionHeader
        title="Conteúdo"
        description="Calendário editorial, ideias, roteiros, legendas e peças em produção."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Nova peça
          </Button>
        }
      />

      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
        <Input placeholder="Buscar peça..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <Tabs
        className="mb-5 w-fit"
        active={format}
        onChange={(id) => setFormat(id as 'all' | ContentFormat)}
        tabs={[{ id: 'all', label: 'Todos', count: visible.length }, ...formatTabs]}
      />

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma peça encontrada" description="Ajuste os filtros ou crie uma nova peça de conteúdo." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              clientName={clientName(item.clientId)}
              responsibleName={userName(item.responsibleId)}
              canApprove={canApprove}
              onStatusChange={(status) => updateContentItem(item.id, { status })}
              onToggleInternalApproval={() => updateContentItem(item.id, { internalApproval: !item.internalApproval })}
              onToggleClientApproval={() => updateContentItem(item.id, { clientApproval: !item.clientApproval })}
              onEdit={() => setEditingItem(item)}
              onDelete={canDelete ? () => handleDelete(item) : undefined}
            />
          ))}
        </div>
      )}

      <ContentFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ContentFormModal open={editingItem !== null} onClose={() => setEditingItem(null)} item={editingItem ?? undefined} />
    </div>
  )
}
