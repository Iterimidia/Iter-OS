import { useState } from 'react'
import type { FormEvent } from 'react'
import type { RoleId } from '@/types'
import { useDataStore } from '@/data/store'
import { ROLE_LIST } from '@/lib/permissions'
import { ROLE_LABELS } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ToggleChip } from '@/components/ui/ToggleChip'

interface FileFormModalProps {
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['Briefings', 'Logos', 'Brandbooks', 'Fotos', 'Vídeos', 'Contratos', 'Propostas', 'Referências', 'Pastas por Cliente', 'Aprovados']
const DEFAULT_ROLES: RoleId[] = ['admin', 'direcao', 'gestao_criativa', 'criativo', 'operacional']

const emptyForm = {
  name: '',
  type: '',
  category: CATEGORIES[0],
  clientId: '',
  url: '',
  description: '',
  visibleToRoles: DEFAULT_ROLES,
}

export function FileFormModal({ open, onClose }: FileFormModalProps) {
  const addFile = useDataStore((s) => s.addFile)
  const clients = useDataStore((s) => s.clients)
  const [form, setForm] = useState(emptyForm)

  function toggleRole(role: RoleId) {
    setForm((f) => ({
      ...f,
      visibleToRoles: f.visibleToRoles.includes(role) ? f.visibleToRoles.filter((r) => r !== role) : [...f.visibleToRoles, role],
    }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) return
    addFile({
      name: form.name,
      type: form.type || form.category,
      category: form.category,
      clientId: form.clientId || undefined,
      url: form.url,
      description: form.description || undefined,
      visibleToRoles: form.visibleToRoles,
    })
    setForm(emptyForm)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo arquivo" description="O Iter OS organiza links — os arquivos continuam no Drive." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="clientId">Cliente</Label>
            <Select id="clientId" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Nenhum (interno)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Input id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="ex: Logo, Contrato..." />
          </div>
        </div>
        <div>
          <Label htmlFor="url">URL (Drive, Figma, etc.)</Label>
          <Input id="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Visível para</Label>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_LIST.filter((r) => r.id !== 'admin').map((r) => (
              <ToggleChip key={r.id} active={form.visibleToRoles.includes(r.id)} onClick={() => toggleRole(r.id)}>
                {ROLE_LABELS[r.id]}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Adicionar arquivo</Button>
        </div>
      </form>
    </Modal>
  )
}
