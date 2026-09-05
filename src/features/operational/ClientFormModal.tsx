import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { BillingType, Client, ClientStatus } from '@/types'
import { useDataStore } from '@/data/store'
import { BILLING_TYPE_LABELS, CLIENT_STATUS_META } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ToggleChip } from '@/components/ui/ToggleChip'

interface ClientFormModalProps {
  open: boolean
  onClose: () => void
  client?: Client
}

const STATUS_OPTIONS: ClientStatus[] = ['ativo', 'em_atencao', 'em_risco', 'inativo']
const BILLING_TYPE_OPTIONS: BillingType[] = ['fixo', 'percentual']

function toFormState(client: Client | undefined, defaults: { plan: string; userId: string }) {
  return {
    name: client?.name ?? '',
    status: client?.status ?? ('ativo' as ClientStatus),
    plan: client?.plan ?? defaults.plan,
    billingType: client?.billingType ?? ('fixo' as BillingType),
    monthlyValue: client ? String(client.monthlyValue) : '',
    commissionPercentage: client?.commissionPercentage !== undefined ? String(client.commissionPercentage) : '',
    services: client?.services ?? ([] as string[]),
    strategicResponsibleId: client?.strategicResponsibleId ?? defaults.userId,
    creativeResponsibleId: client?.creativeResponsibleId ?? defaults.userId,
    driveFolderUrl: client?.driveFolderUrl ?? '',
    segment: client?.segment ?? '',
    briefing: client?.briefing ?? '',
    pendencies: client?.pendencies ?? '',
    notes: client?.notes ?? '',
  }
}

export function ClientFormModal({ open, onClose, client }: ClientFormModalProps) {
  const addClient = useDataStore((s) => s.addClient)
  const updateClient = useDataStore((s) => s.updateClient)
  const users = useDataStore((s) => s.users)
  const appSettings = useDataStore((s) => s.appSettings)

  const defaults = { plan: appSettings.plans[0] ?? '', userId: users[0]?.id ?? '' }
  const [form, setForm] = useState(() => toFormState(client, defaults))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toFormState(client, defaults))
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, open])

  function toggleService(service: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(service) ? f.services.filter((s) => s !== service) : [...f.services, service],
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !form.name.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        monthlyValue: form.billingType === 'fixo' ? Number(form.monthlyValue) || 0 : 0,
        commissionPercentage: form.billingType === 'percentual' ? Number(form.commissionPercentage) || 0 : undefined,
      }
      const result = client ? await updateClient(client.id, payload) : await addClient(payload)
      // Só fecha se a persistência realmente confirmou — em falha, o alert
      // (disparado pela própria action) já avisa, e o formulário continua
      // aberto com os dados preenchidos, em vez de sumir como se tivesse dado certo.
      if (result.ok) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Editar cliente' : 'Novo cliente'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nome do cliente</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="segment">Segmento</Label>
            <Input id="segment" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="plan">Plano</Label>
            <Select id="plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              {appSettings.plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="billingType">Tipo de cobrança</Label>
            <Select id="billingType" value={form.billingType} onChange={(e) => setForm({ ...form, billingType: e.target.value as BillingType })}>
              {BILLING_TYPE_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {BILLING_TYPE_LABELS[b]}
                </option>
              ))}
            </Select>
          </div>
          {form.billingType === 'fixo' ? (
            <div>
              <Label htmlFor="monthlyValue">Valor mensal (R$)</Label>
              <Input
                id="monthlyValue"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyValue}
                onChange={(e) => setForm({ ...form, monthlyValue: e.target.value })}
                placeholder="0,00"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="commissionPercentage">Percentual sobre vendas (%)</Label>
              <Input
                id="commissionPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commissionPercentage}
                onChange={(e) => setForm({ ...form, commissionPercentage: e.target.value })}
                placeholder="0,0"
              />
            </div>
          )}
          <div>
            <Label htmlFor="strategic">Responsável estratégico</Label>
            <Select id="strategic" value={form.strategicResponsibleId} onChange={(e) => setForm({ ...form, strategicResponsibleId: e.target.value })}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="creative">Responsável criativo</Label>
            <Select id="creative" value={form.creativeResponsibleId} onChange={(e) => setForm({ ...form, creativeResponsibleId: e.target.value })}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="drive">Pasta Drive (link)</Label>
          <Input id="drive" value={form.driveFolderUrl} onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })} placeholder="https://drive.google.com/..." />
        </div>

        <div>
          <Label>Serviços contratados</Label>
          <div className="flex flex-wrap gap-1.5">
            {appSettings.services.map((service) => (
              <ToggleChip key={service} active={form.services.includes(service)} onClick={() => toggleService(service)}>
                {service}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="briefing">Briefing</Label>
          <Textarea id="briefing" rows={2} value={form.briefing} onChange={(e) => setForm({ ...form, briefing: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="pendencies">Pendências</Label>
          <Textarea id="pendencies" rows={2} value={form.pendencies} onChange={(e) => setForm({ ...form, pendencies: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="notes">Observações estratégicas</Label>
          <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {client ? 'Salvar alterações' : 'Criar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
