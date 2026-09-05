import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import type { ClientStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, getAccessibleClients } from '@/lib/permissions'
import { CLIENT_STATUS_META } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { ClientCard } from '@/components/cards/ClientCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { ClientFormModal } from '@/features/operational/ClientFormModal'

const STATUS_FILTERS: ClientStatus[] = ['ativo', 'em_atencao', 'em_risco', 'inativo']

export function ClientsListPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const accessible = getAccessibleClients(user, clients)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ClientStatus>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = accessible.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const findUser = (id: string) => users.find((u) => u.id === id)

  return (
    <div>
      <SectionHeader
        title="Clientes"
        description={`${accessible.length} cliente(s) na sua visão.`}
        action={
          canPerformAction(user, 'criar') && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Novo cliente
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
          <Input placeholder="Buscar cliente..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Tabs
          tabs={[
            { id: 'all', label: 'Todos', count: accessible.length },
            ...STATUS_FILTERS.map((s) => ({
              id: s,
              label: CLIENT_STATUS_META[s].label,
              count: accessible.filter((c) => c.status === s).length,
            })),
          ]}
          active={statusFilter}
          onChange={(id) => setStatusFilter(id as 'all' | ClientStatus)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros ou cadastre um novo cliente." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              strategicResponsible={findUser(client.strategicResponsibleId)}
              creativeResponsible={findUser(client.creativeResponsibleId)}
              onClick={() => navigate(`/operacional/clientes/${client.id}`)}
            />
          ))}
        </div>
      )}

      <ClientFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
