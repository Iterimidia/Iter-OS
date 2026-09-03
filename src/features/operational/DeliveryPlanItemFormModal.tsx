import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { DeliveryPlanItem } from '@/types'
import { useDataStore } from '@/data/store'
import { CONTENT_FORMAT_ORDER, CONTENT_FORMAT_LABELS } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface DeliveryPlanItemFormModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  item?: DeliveryPlanItem
}

function toFormState(item: DeliveryPlanItem | undefined) {
  return {
    label: item?.label ?? '',
    monthlyQuantity: item ? String(item.monthlyQuantity) : '',
  }
}

export function DeliveryPlanItemFormModal({ open, onClose, clientId, item }: DeliveryPlanItemFormModalProps) {
  const addDeliveryPlanItem = useDataStore((s) => s.addDeliveryPlanItem)
  const updateDeliveryPlanItem = useDataStore((s) => s.updateDeliveryPlanItem)

  const [form, setForm] = useState(() => toFormState(item))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toFormState(item))
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const quantity = Number(form.monthlyQuantity)
    if (submitting || !form.label.trim() || !quantity || quantity < 1) return
    setSubmitting(true)
    try {
      const payload = { label: form.label.trim(), monthlyQuantity: Math.round(quantity) }
      const result = item ? await updateDeliveryPlanItem(item.id, payload) : await addDeliveryPlanItem({ ...payload, clientId })
      if (result.ok) onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar item contratado' : 'Novo item contratado'} description="Ex: Posts, Reels, Stories — quanto o cliente contratou por mês.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="deliveryLabel">O que é</Label>
          <Input
            id="deliveryLabel"
            list="delivery-label-options"
            required
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Escolha ou escreva..."
          />
          <datalist id="delivery-label-options">
            {CONTENT_FORMAT_ORDER.map((f) => (
              <option key={f} value={CONTENT_FORMAT_LABELS[f]} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="deliveryQuantity">Quantidade contratada por mês</Label>
          <Input
            id="deliveryQuantity"
            type="number"
            min="1"
            step="1"
            required
            value={form.monthlyQuantity}
            onChange={(e) => setForm({ ...form, monthlyQuantity: e.target.value })}
            placeholder="Ex: 6"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {item ? 'Salvar alterações' : 'Adicionar item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
