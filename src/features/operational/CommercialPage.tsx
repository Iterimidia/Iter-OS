import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Plus, Search, Trash2 } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { LEAD_STATUS_META, LEAD_STATUS_ORDER, cn, formatCurrency, formatDate, isOverdue } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/ui/StatusSelect'
import { KanbanBoard } from '@/components/tables/KanbanBoard'
import { DataTable } from '@/components/tables/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'

const KANBAN_COLUMNS = LEAD_STATUS_ORDER.map((id) => ({ id, label: LEAD_STATUS_META[id].label }))

const emptyForm = {
  companyName: '',
  responsibleName: '',
  contact: '',
  instagramOrSite: '',
  segment: '',
  origin: '',
  serviceInterest: '',
  estimatedValue: '',
  nextAction: '',
  followUpDate: '',
  notes: '',
}

export function CommercialPage() {
  const user = useCurrentUser()!
  const leads = useDataStore((s) => s.leads)
  const addLead = useDataStore((s) => s.addLead)
  const updateLead = useDataStore((s) => s.updateLead)
  const removeLead = useDataStore((s) => s.removeLead)
  const appSettings = useDataStore((s) => s.appSettings)

  const [tab, setTab] = useState('funil')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState('')

  const canDelete = canPerformAction(user, 'excluir')

  function matchesQuery(l: Lead) {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      l.companyName.toLowerCase().includes(q) ||
      l.responsibleName.toLowerCase().includes(q) ||
      l.contact.toLowerCase().includes(q) ||
      l.segment.toLowerCase().includes(q)
    )
  }

  const filteredLeads = leads.filter(matchesQuery)

  const followUps = leads
    .filter((l) => l.followUpDate)
    .filter(matchesQuery)
    .sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''))

  function updateStatus(lead: Lead, status: LeadStatus) {
    updateLead(lead.id, { status })
  }

  function handleDeleteLead(lead: Lead) {
    if (window.confirm(`Excluir o lead "${lead.companyName}"?`)) {
      removeLead(lead.id)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) return
    addLead({
      companyName: form.companyName,
      responsibleName: form.responsibleName,
      contact: form.contact,
      instagramOrSite: form.instagramOrSite || undefined,
      segment: form.segment,
      origin: form.origin,
      status: 'lead',
      serviceInterest: form.serviceInterest,
      estimatedValue: Number(form.estimatedValue) || 0,
      nextAction: form.nextAction || undefined,
      followUpDate: form.followUpDate || undefined,
      notes: form.notes || undefined,
    })
    setForm(emptyForm)
    setModalOpen(false)
  }

  return (
    <div>
      <SectionHeader
        title="Comercial"
        description="Funil comercial da Iter: leads, oportunidades, propostas e follow-ups."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Novo lead
          </Button>
        }
      />

      <Tabs
        className="mb-5 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'funil', label: 'Funil', count: filteredLeads.length },
          { id: 'followups', label: 'Follow-ups', count: followUps.length },
          { id: 'servicos', label: 'Serviços Oferecidos' },
        ]}
      />

      {tab !== 'servicos' && (
        <div className="relative mb-4 w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
          <Input placeholder="Buscar por empresa, contato, segmento..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
      )}

      {tab === 'funil' && (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={filteredLeads}
          getId={(l) => l.id}
          getStatus={(l) => l.status}
          onStatusChange={updateStatus}
          renderCard={(lead) => (
            <LeadCard lead={lead} onStatusChange={(status) => updateStatus(lead, status)} onDelete={canDelete ? () => handleDeleteLead(lead) : undefined} />
          )}
        />
      )}

      {tab === 'followups' && (
        <DataTable
          data={followUps}
          keyField={(l) => l.id}
          emptyTitle="Nenhum follow-up encontrado"
          columns={[
            { key: 'empresa', header: 'Empresa', render: (l) => <span className="font-medium text-iter-text">{l.companyName}</span> },
            { key: 'responsavel', header: 'Responsável', render: (l) => l.responsibleName },
            { key: 'contato', header: 'Contato', render: (l) => l.contact },
            {
              key: 'status',
              header: 'Status',
              render: (l) => <Badge tone={LEAD_STATUS_META[l.status].tone}>{LEAD_STATUS_META[l.status].label}</Badge>,
            },
            {
              key: 'followup',
              header: 'Follow-up',
              render: (l) => (
                <span className={cn('inline-flex items-center gap-1', isOverdue(l.followUpDate) && 'text-iter-danger')}>
                  {isOverdue(l.followUpDate) && <AlertTriangle className="h-3 w-3" />}
                  {l.followUpDate ? formatDate(l.followUpDate) : '—'}
                </span>
              ),
            },
            { key: 'proxima', header: 'Próxima ação', render: (l) => <span className="text-iter-muted">{l.nextAction ?? '—'}</span> },
            ...(canDelete
              ? [
                  {
                    key: 'acoes',
                    header: '',
                    render: (l: Lead) => (
                      <button
                        onClick={() => handleDeleteLead(l)}
                        className="focus-ring rounded-md p-1 text-iter-faint hover:text-iter-danger"
                        aria-label="Excluir lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      {tab === 'servicos' && (
        <div>
          {appSettings.services.length === 0 ? (
            <EmptyState title="Nenhum serviço cadastrado" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {appSettings.services.map((service) => (
                <div key={service} className="card-surface p-4 text-sm font-medium text-iter-text">
                  {service}
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-iter-faint">Edite esta lista em Base Operacional → Configurações.</p>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo lead" description="Cadastre uma nova oportunidade no funil comercial." size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="companyName">Empresa</Label>
              <Input id="companyName" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="responsibleName">Responsável</Label>
              <Input id="responsibleName" value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="contact">Contato</Label>
              <Input id="contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="telefone ou e-mail" />
            </div>
            <div>
              <Label htmlFor="instagramOrSite">Instagram / site</Label>
              <Input id="instagramOrSite" value={form.instagramOrSite} onChange={(e) => setForm({ ...form, instagramOrSite: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="segment">Segmento</Label>
              <Input id="segment" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="origin">Origem</Label>
              <Input id="origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="indicação, anúncio..." />
            </div>
            <div>
              <Label htmlFor="serviceInterest">Serviço de interesse</Label>
              <Select id="serviceInterest" value={form.serviceInterest} onChange={(e) => setForm({ ...form, serviceInterest: e.target.value })}>
                <option value="">Selecione</option>
                {appSettings.services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedValue">Valor estimado (R$)</Label>
              <Input
                id="estimatedValue"
                type="number"
                min="0"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="followUpDate">Data de follow-up</Label>
              <Input id="followUpDate" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nextAction">Próxima ação</Label>
              <Input id="nextAction" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar lead</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function LeadCard({ lead, onStatusChange, onDelete }: { lead: Lead; onStatusChange: (status: LeadStatus) => void; onDelete?: () => void }) {
  return (
    <div className="card-surface space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug text-iter-text">{lead.companyName}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {lead.estimatedValue > 0 && <span className="text-[11px] font-medium text-iter-success">{formatCurrency(lead.estimatedValue)}</span>}
          {onDelete && (
            <button onClick={onDelete} className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger" aria-label="Excluir lead">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {lead.serviceInterest && <Badge tone="neutral">{lead.serviceInterest}</Badge>}
      <p className="text-[11px] text-iter-muted">{lead.responsibleName || '—'}</p>
      {lead.followUpDate && (
        <p className={cn('flex items-center gap-1 text-[11px]', isOverdue(lead.followUpDate) ? 'text-iter-danger' : 'text-iter-faint')}>
          {isOverdue(lead.followUpDate) && <AlertTriangle className="h-3 w-3" />}
          Follow-up: {formatDate(lead.followUpDate)}
        </p>
      )}
      <StatusSelect
        value={lead.status}
        onChange={onStatusChange}
        options={LEAD_STATUS_ORDER.map((s) => ({ value: s, label: LEAD_STATUS_META[s].label }))}
      />
    </div>
  )
}
