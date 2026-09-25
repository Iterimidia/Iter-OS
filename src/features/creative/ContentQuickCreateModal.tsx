import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { ContentFormat } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { CONTENT_FORMAT_LABELS, CONTENT_FORMAT_ORDER, currentMonthKey, formatMonthLabel, shiftMonthKey } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const MONTH_CHOICES = Array.from({ length: 4 }, (_, i) => shiftMonthKey(currentMonthKey(), i))

interface ContentQuickCreateModalProps {
  open: boolean
  onClose: () => void
  /** Criado -> abre a tela de detalhe pra completar o resto (spec §2/§4). */
  onCreated: (id: string) => void
  /** Pré-seleciona o cliente (ex: criação a partir da aba Conteúdo do Client Hub) e trava o campo. */
  defaultClientId?: string
}

/**
 * Criação rápida (spec §4): "A ideia não é transformar isso num formulário
 * gigantesco" — só cliente, formato, mês e tema. Tudo o mais se preenche na
 * tela de detalhe, que abre em seguida.
 */
export function ContentQuickCreateModal({ open, onClose, onCreated, defaultClientId }: ContentQuickCreateModalProps) {
  const user = useCurrentUser()!
  const addContentItem = useDataStore((s) => s.addContentItem)
  const clients = useDataStore((s) => s.clients)

  const [clientId, setClientId] = useState('')
  const [format, setFormat] = useState<ContentFormat>('post_estatico')
  const [referenceMonth, setReferenceMonth] = useState(MONTH_CHOICES[0])
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId ?? '')
      setFormat('post_estatico')
      setReferenceMonth(MONTH_CHOICES[0])
      setTitle('')
      setSubmitting(false)
    }
  }, [open, defaultClientId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !clientId || !title.trim()) return
    setSubmitting(true)
    try {
      const result = await addContentItem({
        clientId,
        format,
        referenceMonth,
        theme: '',
        title,
        editorialResponsibleId: user.id,
        status: 'planejado',
      })
      if (result.ok) {
        onClose()
        onCreated(result.data.id)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova peça de conteúdo" description="Só o essencial agora — o resto você completa na ficha do conteúdo." size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="qc-client">Cliente</Label>
          <Select id="qc-client" required disabled={!!defaultClientId} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="qc-format">Formato</Label>
          <Select id="qc-format" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>
            {CONTENT_FORMAT_ORDER.map((f) => (
              <option key={f} value={f}>
                {CONTENT_FORMAT_LABELS[f]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="qc-month">Mês de referência</Label>
          <Select id="qc-month" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)}>
            {MONTH_CHOICES.map((m) => (
              <option key={m} value={m} className="capitalize">
                {formatMonthLabel(m)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="qc-title">Tema/título</Label>
          <Input id="qc-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reel de bastidores da semana" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Criar e abrir ficha
          </Button>
        </div>
      </form>
    </Modal>
  )
}
