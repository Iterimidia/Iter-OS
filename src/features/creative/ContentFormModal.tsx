import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ContentFormat } from '@/types'
import { useDataStore } from '@/data/store'
import { CONTENT_FORMAT_LABELS, CONTENT_FORMAT_ORDER } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ContentFormModalProps {
  open: boolean
  onClose: () => void
}

const emptyForm = {
  clientId: '',
  projectId: '',
  format: 'post_estatico' as ContentFormat,
  theme: '',
  title: '',
  responsibleId: '',
  dueDate: '',
  publishDate: '',
  caption: '',
  script: '',
  fileUrl: '',
}

export function ContentFormModal({ open, onClose }: ContentFormModalProps) {
  const addContentItem = useDataStore((s) => s.addContentItem)
  const clients = useDataStore((s) => s.clients)
  const projects = useDataStore((s) => s.projects)
  const users = useDataStore((s) => s.users)

  const [form, setForm] = useState(emptyForm)
  const availableProjects = projects.filter((p) => !form.clientId || p.clientId === form.clientId)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.clientId || !form.responsibleId) return
    addContentItem({
      clientId: form.clientId,
      projectId: form.projectId || undefined,
      format: form.format,
      theme: form.theme,
      title: form.title,
      responsibleId: form.responsibleId,
      status: 'a_fazer',
      dueDate: form.dueDate || undefined,
      publishDate: form.publishDate || undefined,
      caption: form.caption || undefined,
      script: form.script || undefined,
      fileUrl: form.fileUrl || undefined,
      internalApproval: false,
      clientApproval: false,
    })
    setForm(emptyForm)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova peça de conteúdo" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="clientId">Cliente</Label>
            <Select id="clientId" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, projectId: '' })}>
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="projectId">Projeto</Label>
            <Select id="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Nenhum</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="format">Formato</Label>
            <Select id="format" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as ContentFormat })}>
              {CONTENT_FORMAT_ORDER.map((f) => (
                <option key={f} value={f}>
                  {CONTENT_FORMAT_LABELS[f]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="theme">Tema</Label>
            <Input id="theme" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="responsibleId">Responsável</Label>
            <Select id="responsibleId" required value={form.responsibleId} onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}>
              <option value="">Selecione</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Prazo de produção</Label>
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="publishDate">Data de publicação</Label>
            <Input id="publishDate" type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="fileUrl">Link do arquivo</Label>
            <Input id="fileUrl" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <div>
          <Label htmlFor="script">Roteiro</Label>
          <Textarea id="script" rows={2} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="caption">Legenda</Label>
          <Textarea id="caption" rows={2} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Criar peça</Button>
        </div>
      </form>
    </Modal>
  )
}
