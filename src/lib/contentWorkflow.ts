import type { ContentItem, ContentStatus } from '@/types'
import { todayIso } from '@/lib/utils'

/** Conteúdo "atrasado" pra fins de card/badge — nunca depois de fechado (spec §14/§16). */
export function isContentOverdue(item: Pick<ContentItem, 'internalDueDate' | 'status'>, today = todayIso()): boolean {
  if (!item.internalDueDate) return false
  if (item.status === 'publicado' || item.status === 'cancelado' || item.status === 'bloqueado') return false
  return item.internalDueDate < today
}

/**
 * Antecedência entre entrega interna e publicação prevista, em dias.
 * Calculada, nunca armazenada (spec §12) — e nunca usada para bloquear nada,
 * só para sinalizar.
 */
export function leadTimeDays(internalDueDate?: string, plannedPublishDate?: string): number | null {
  if (!internalDueDate || !plannedPublishDate) return null
  const due = new Date(`${internalDueDate}T00:00:00Z`)
  const pub = new Date(`${plannedPublishDate}T00:00:00Z`)
  return Math.round((pub.getTime() - due.getTime()) / 86_400_000)
}

/**
 * Carimbos automáticos de data ao entrar num novo status (spec Conteúdo 2.0
 * §11: "ninguém precisa digitar manualmente 'entrei em produção às 14:37'
 * quando o sistema literalmente assistiu à mudança de status acontecer").
 * Substitui o histórico genérico descartado por decisão explícita — a
 * rastreabilidade desta fase vive nestes metadados específicos, não em log.
 */
export function resolveContentStatusStamps(newStatus: ContentStatus): Partial<ContentItem> {
  const now = new Date().toISOString()
  switch (newStatus) {
    case 'aguardando_aprovacao':
      return { sentForApprovalAt: now }
    case 'aprovado':
      return { approvedAt: now }
    case 'bloqueado':
      return { blockedAt: now }
    case 'programado':
      return { scheduledAt: now }
    case 'publicado':
      return { actualPublishDate: now.slice(0, 10) }
    default:
      return {}
  }
}

/**
 * Regra única (spec §8) do mínimo comum + exigência por formato para um
 * conteúdo poder virar "Briefing pronto". Centralizada aqui para não ser
 * replicada em várias telas. Retorna os rótulos faltantes — lista vazia
 * significa pronto. Legenda e CTA nunca entram aqui (instrução explícita).
 */
export function getMissingBriefingRequirements(item: Partial<ContentItem>): string[] {
  const missing: string[] = []
  if (!item.clientId) missing.push('Cliente')
  if (!item.referenceMonth) missing.push('Mês de referência')
  if (!item.channels || item.channels.length === 0) missing.push('Canal')
  if (!item.format) missing.push('Formato')
  if (!item.title?.trim()) missing.push('Tema/título')
  if (!item.internalDueDate) missing.push('Data de entrega interna')
  if (!item.plannedPublishDate) missing.push('Data prevista de publicação')
  if (!item.editorialResponsibleId) missing.push('Responsável editorial')
  if (!item.executorId) missing.push('Executora')

  if (item.format === 'carrossel') {
    const slides = item.slides ?? []
    if (slides.length === 0 || slides.some((s) => !s.text?.trim())) missing.push('Slides preenchidos')
  } else if (item.format === 'reel') {
    if (!item.script?.trim()) missing.push('Roteiro')
  } else if (item.format === 'post_estatico') {
    if (!item.mainContent?.trim()) missing.push('Conteúdo principal')
  }

  return missing
}

export function isReadyForBriefingPronto(item: Partial<ContentItem>): boolean {
  return getMissingBriefingRequirements(item).length === 0
}
