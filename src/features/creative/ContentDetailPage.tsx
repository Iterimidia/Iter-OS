import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Plus, Trash2 } from 'lucide-react'
import type { ContentChannel, ContentFormat, ContentItem, ContentStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, getAccessibleClients } from '@/lib/permissions'
import { getMissingBriefingRequirements, leadTimeDays } from '@/lib/contentWorkflow'
import {
  cn,
  CONTENT_CHANNEL_LABELS,
  CONTENT_CHANNEL_ORDER,
  CONTENT_FORMAT_LABELS,
  CONTENT_FORMAT_ORDER,
  CONTENT_STATUS_META,
  CONTENT_STATUS_ORDER,
  currentMonthKey,
  formatDate,
  formatMonthLabel,
  generateId,
  shiftMonthKey,
} from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToggleChip } from '@/components/ui/ToggleChip'
import { StatusSelect } from '@/components/ui/StatusSelect'
import { EmptyState } from '@/components/ui/EmptyState'

// 2 meses pra trás até 5 pra frente — cobre correções e planejamento adiantado.
const MONTH_CHOICES = Array.from({ length: 8 }, (_, i) => shiftMonthKey(currentMonthKey(), i - 2))

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  if (!text?.trim()) return null
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
      }}
      className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-iter-faint hover:bg-iter-surface-hover hover:text-iter-text"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

function toFormState(item: ContentItem | undefined) {
  return {
    clientId: item?.clientId ?? '',
    referenceMonth: item?.referenceMonth ?? currentMonthKey(),
    channels: item?.channels ?? ([] as ContentChannel[]),
    format: item?.format ?? ('post_estatico' as ContentFormat),
    title: item?.title ?? '',
    objective: item?.objective ?? '',
    internalDueDate: item?.internalDueDate ?? '',
    plannedPublishDate: item?.plannedPublishDate ?? '',
    hook: item?.hook ?? '',
    mainContent: item?.mainContent ?? '',
    caption: item?.caption ?? '',
    cta: item?.cta ?? '',
    script: item?.script ?? '',
    slides: item?.slides ?? [],
    fileUrl: item?.fileUrl ?? '',
    editorialResponsibleId: item?.editorialResponsibleId ?? '',
    executorId: item?.executorId ?? '',
    creativeReviewerId: item?.creativeReviewerId ?? '',
  }
}

/**
 * Ficha do conteúdo — rota própria, não modal (decisão explícita: o volume
 * de campos não cabe bem num formulário flutuante). Seções seguem os 6
 * blocos da especificação; status/bloqueio/cancelamento agem na hora (têm
 * consequência de workflow própria), o resto do formulário é salvo junto.
 */
export function ContentDetailPage() {
  const { contentId } = useParams<{ contentId: string }>()
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const item = useDataStore((s) => s.contentItems.find((c) => c.id === contentId))
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const updateContentItem = useDataStore((s) => s.updateContentItem)
  const removeContentItem = useDataStore((s) => s.removeContentItem)

  const canEdit = canPerformAction(user, 'editar')
  const canDelete = canPerformAction(user, 'excluir')

  const [form, setForm] = useState(() => toFormState(item))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [blockNote, setBlockNote] = useState('')

  useEffect(() => {
    setForm(toFormState(item))
  }, [item])

  const accessibleIds = new Set(getAccessibleClients(user, clients).map((c) => c.id))
  const backButton = (
    <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/criativo/conteudo')}>
      Voltar pra Conteúdo
    </Button>
  )

  if (!item) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState title="Conteúdo não encontrado" description="Pode ter sido excluído, ou o link está errado." />
      </div>
    )
  }
  if (!accessibleIds.has(item.clientId)) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState title="Sem acesso" description="Você não tem acesso ao cliente deste conteúdo." />
      </div>
    )
  }

  const missing = getMissingBriefingRequirements({ ...item, ...form })
  const lead = leadTimeDays(form.internalDueDate || undefined, form.plannedPublishDate || undefined)
  const client = clients.find((c) => c.id === item.clientId)
  const allSlidesText = form.slides.map((s, i) => `Slide ${i + 1}\n${s.text}`).join('\n\n')

  function toggleChannel(ch: ContentChannel) {
    setForm((f) => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateContentItem(item!.id, {
        clientId: form.clientId,
        referenceMonth: form.referenceMonth || undefined,
        channels: form.channels.length ? form.channels : undefined,
        format: form.format,
        title: form.title,
        objective: form.objective || undefined,
        internalDueDate: form.internalDueDate || undefined,
        plannedPublishDate: form.plannedPublishDate || undefined,
        hook: form.hook || undefined,
        mainContent: form.mainContent || undefined,
        caption: form.caption || undefined,
        cta: form.cta || undefined,
        script: form.script || undefined,
        slides: form.format === 'carrossel' ? form.slides : undefined,
        fileUrl: form.fileUrl || undefined,
        editorialResponsibleId: form.editorialResponsibleId,
        executorId: form.executorId || undefined,
        creativeReviewerId: form.creativeReviewerId || undefined,
      })
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleStatusChange(status: ContentStatus) {
    updateContentItem(item!.id, { status })
  }

  function handleBlock() {
    updateContentItem(item!.id, { status: 'bloqueado', blockedReason: blockReason || undefined, blockedNote: blockNote || undefined })
    setBlockOpen(false)
    setBlockReason('')
    setBlockNote('')
  }

  function handleCancel() {
    if (window.confirm('Cancelar este conteúdo? Ele sai da sequência normal do pipeline.')) {
      updateContentItem(item!.id, { status: 'cancelado' })
    }
  }

  function handleDelete() {
    if (window.confirm(`Excluir "${item!.title}" definitivamente?`)) {
      removeContentItem(item!.id).then((r) => {
        if (r.ok) navigate('/criativo/conteudo')
      })
    }
  }

  function addSlide() {
    setForm((f) => ({ ...f, slides: [...f.slides, { id: generateId('sld'), text: '' }] }))
  }
  function removeSlide(id: string) {
    setForm((f) => ({ ...f, slides: f.slides.filter((s) => s.id !== id) }))
  }
  function moveSlide(id: string, dir: -1 | 1) {
    setForm((f) => {
      const idx = f.slides.findIndex((s) => s.id === id)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= f.slides.length) return f
      const next = [...f.slides]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...f, slides: next }
    })
  }
  function updateSlideText(id: string, text: string) {
    setForm((f) => ({ ...f, slides: f.slides.map((s) => (s.id === id ? { ...s, text } : s)) }))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <div className="flex items-center gap-2">
          {canDelete && (
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
              Excluir
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={handleSave} loading={saving}>
              {saved ? 'Salvo' : 'Salvar alterações'}
            </Button>
          )}
        </div>
      </div>

      <SectionHeader title={item.title} description={`${client?.name ?? 'Cliente'} · ${CONTENT_FORMAT_LABELS[item.format]}`} />

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <StatusSelect
                value={item.status}
                onChange={handleStatusChange}
                disabled={!canEdit}
                options={CONTENT_STATUS_ORDER.map((s) => ({ value: s, label: CONTENT_STATUS_META[s].label }))}
              />
            </div>
            {canEdit && item.status !== 'bloqueado' && item.status !== 'cancelado' && (
              <Button variant="outline" size="sm" onClick={() => setBlockOpen((v) => !v)}>
                Bloquear
              </Button>
            )}
            {canEdit && item.status !== 'cancelado' && item.status !== 'publicado' && (
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>

          {blockOpen && (
            <div className="space-y-2 rounded-lg border border-iter-border bg-iter-surface-alt p-3">
              <div>
                <Label htmlFor="block-reason">Motivo do bloqueio</Label>
                <Input
                  id="block-reason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: aguardando material do cliente"
                />
              </div>
              <div>
                <Label htmlFor="block-note">Observação</Label>
                <Textarea id="block-note" rows={2} value={blockNote} onChange={(e) => setBlockNote(e.target.value)} />
              </div>
              <Button size="sm" onClick={handleBlock}>
                Confirmar bloqueio
              </Button>
            </div>
          )}

          {item.status === 'bloqueado' && (item.blockedReason || item.blockedNote) && (
            <div className="rounded-lg border border-iter-danger/25 bg-iter-danger/5 p-3 text-xs text-iter-text">
              {item.blockedReason && (
                <p>
                  <b>Motivo:</b> {item.blockedReason}
                </p>
              )}
              {item.blockedNote && <p className="mt-1">{item.blockedNote}</p>}
              {item.blockedAt && <p className="mt-1 text-iter-faint">Desde {formatDate(item.blockedAt.slice(0, 10))}</p>}
            </div>
          )}

          {missing.length > 0 && (item.status === 'planejado' || item.status === 'briefing_pronto') && (
            <div className="rounded-lg border border-iter-warning/25 bg-iter-warning/5 p-3 text-xs text-iter-text">
              <p className="font-medium">Falta para "Briefing pronto":</p>
              <p className="mt-1 text-iter-muted">{missing.join(', ')}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-[11px] text-iter-faint">
            {item.sentForApprovalAt && <span>Enviado para aprovação: {formatDate(item.sentForApprovalAt.slice(0, 10))}</span>}
            {item.approvedAt && <span>Aprovado: {formatDate(item.approvedAt.slice(0, 10))}</span>}
            {item.scheduledAt && <span>Programado: {formatDate(item.scheduledAt.slice(0, 10))}</span>}
            {item.actualPublishDate && <span>Publicado: {formatDate(item.actualPublishDate)}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="d-client">Cliente</Label>
            <Select id="d-client" disabled={!canEdit} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {clients
                .filter((c) => accessibleIds.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="d-month">Mês de referência</Label>
            <Select id="d-month" disabled={!canEdit} value={form.referenceMonth} onChange={(e) => setForm({ ...form, referenceMonth: e.target.value })}>
              {MONTH_CHOICES.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {formatMonthLabel(m)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="d-format">Formato</Label>
            <Select
              id="d-format"
              disabled={!canEdit}
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value as ContentFormat })}
            >
              {CONTENT_FORMAT_ORDER.map((f) => (
                <option key={f} value={f}>
                  {CONTENT_FORMAT_LABELS[f]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="d-title">Tema/título</Label>
            <Input id="d-title" disabled={!canEdit} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Canais</Label>
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_CHANNEL_ORDER.map((ch) => (
                <ToggleChip key={ch} active={form.channels.includes(ch)} onClick={() => toggleChannel(ch)} disabled={!canEdit}>
                  {CONTENT_CHANNEL_LABELS[ch]}
                </ToggleChip>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planejamento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="d-objective">Objetivo</Label>
            <Textarea
              id="d-objective"
              disabled={!canEdit}
              rows={2}
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="d-due">Data de entrega interna</Label>
            <Input
              id="d-due"
              type="date"
              disabled={!canEdit}
              value={form.internalDueDate}
              onChange={(e) => setForm({ ...form, internalDueDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="d-pub">Data prevista de publicação</Label>
            <Input
              id="d-pub"
              type="date"
              disabled={!canEdit}
              value={form.plannedPublishDate}
              onChange={(e) => setForm({ ...form, plannedPublishDate: e.target.value })}
            />
          </div>
          {lead !== null && (
            <p className={cn('text-xs sm:col-span-2', lead < 15 ? 'text-iter-warning' : 'text-iter-faint')}>
              Antecedência: {lead} dia(s){lead < 15 && ' — abaixo do recomendado (15–30 dias), mas isso não bloqueia nada.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editorial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="d-hook">Gancho</Label>
              <CopyButton text={form.hook} label="Copiar" />
            </div>
            <Textarea id="d-hook" disabled={!canEdit} rows={2} value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="d-main">Conteúdo principal</Label>
              <CopyButton text={form.mainContent} label="Copiar" />
            </div>
            <Textarea
              id="d-main"
              disabled={!canEdit}
              rows={4}
              value={form.mainContent}
              onChange={(e) => setForm({ ...form, mainContent: e.target.value })}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="d-caption">Legenda</Label>
              <CopyButton text={form.caption} label="Copiar" />
            </div>
            <Textarea
              id="d-caption"
              disabled={!canEdit}
              rows={3}
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="d-cta">CTA</Label>
              <CopyButton text={form.cta} label="Copiar" />
            </div>
            <Input id="d-cta" disabled={!canEdit} value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {form.format === 'carrossel' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Slides</CardTitle>
              <CopyButton text={allSlidesText} label="Copiar todos os slides" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.slides.length === 0 && <p className="text-xs text-iter-faint">Nenhum slide ainda.</p>}
            {form.slides.map((slide, i) => (
              <div key={slide.id} className="flex gap-2">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <span className="text-[11px] font-medium text-iter-faint">{i + 1}</span>
                  <button
                    type="button"
                    disabled={!canEdit || i === 0}
                    onClick={() => moveSlide(slide.id, -1)}
                    className="text-iter-faint hover:text-iter-text disabled:opacity-30"
                    aria-label="Mover slide para cima"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || i === form.slides.length - 1}
                    onClick={() => moveSlide(slide.id, 1)}
                    className="text-iter-faint hover:text-iter-text disabled:opacity-30"
                    aria-label="Mover slide para baixo"
                  >
                    ↓
                  </button>
                </div>
                <Textarea
                  disabled={!canEdit}
                  rows={2}
                  value={slide.text}
                  onChange={(e) => updateSlideText(slide.id, e.target.value)}
                  className="flex-1"
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeSlide(slide.id)}
                    className="self-start p-2 text-iter-faint hover:text-iter-danger"
                    aria-label="Remover slide"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addSlide}>
                Adicionar slide
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {form.format === 'reel' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Roteiro</CardTitle>
              <CopyButton text={form.script} label="Copiar roteiro" />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea disabled={!canEdit} rows={8} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Produção</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="d-editorial">Responsável editorial</Label>
            <Select
              id="d-editorial"
              disabled={!canEdit}
              required
              value={form.editorialResponsibleId}
              onChange={(e) => setForm({ ...form, editorialResponsibleId: e.target.value })}
            >
              <option value="">Selecione</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="d-executor">Executora</Label>
            <Select id="d-executor" disabled={!canEdit} value={form.executorId} onChange={(e) => setForm({ ...form, executorId: e.target.value })}>
              <option value="">Selecione</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="d-reviewer">Revisora criativa</Label>
            <Select
              id="d-reviewer"
              disabled={!canEdit}
              value={form.creativeReviewerId}
              onChange={(e) => setForm({ ...form, creativeReviewerId: e.target.value })}
            >
              <option value="">Selecione</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publicação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="d-file">Link do arquivo final</Label>
            <Input id="d-file" disabled={!canEdit} value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {item.scheduledAt ? (
              <Badge tone="primary">Programado em {formatDate(item.scheduledAt.slice(0, 10))}</Badge>
            ) : (
              <span className="text-xs text-iter-faint">Ainda não programado.</span>
            )}
            {item.actualPublishDate && <Badge tone="success">Publicado em {formatDate(item.actualPublishDate)}</Badge>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
