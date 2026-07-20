import { useState } from 'react'
import type { FormEvent } from 'react'
import type { FinancialStatus, FinancialType } from '@/types'
import { useDataStore } from '@/data/store'
import { FINANCIAL_STATUS_META } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface FinancialEntryFormModalProps {
  open: boolean
  onClose: () => void
  type: FinancialType
}

const STATUS_OPTIONS: FinancialStatus[] = ['previsto', 'pendente', 'pago', 'vencido']

function emptyForm(type: FinancialType) {
  return { type, category: '', description: '', clientId: '', amount: '', dueDate: '', status: 'previsto' as FinancialStatus, recurring: false }
}

export function FinancialEntryFormModal({ open, onClose, type }: FinancialEntryFormModalProps) {
  const addFinancialEntry = useDataStore((s) => s.addFinancialEntry)
  const clients = useDataStore((s) => s.clients)
  const [form, setForm] = useState(() => emptyForm(type))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.description.trim() || !form.dueDate) return
    addFinancialEntry({
      type,
      category: form.category || (type === 'receita' ? 'Outros' : 'Outros'),
      description: form.description,
      clientId: form.clientId || undefined,
      amount: Number(form.amount) || 0,
      dueDate: form.dueDate,
      status: form.status,
      recurring: form.recurring,
      paidDate: form.status === 'pago' ? new Date().toISOString().slice(0, 10) : undefined,
    })
    setForm(emptyForm(type))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={type === 'receita' ? 'Nova receita' : 'Nova despesa'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          {type === 'receita' && (
            <div>
              <Label htmlFor="clientId">Cliente</Label>
              <Select id="clientId" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="dueDate">Vencimento</Label>
            <Input id="dueDate" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FinancialStatus })}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {FINANCIAL_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-xs text-iter-muted">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-iter-border accent-iter-primary"
            />
            Recorrente (mensal)
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}
