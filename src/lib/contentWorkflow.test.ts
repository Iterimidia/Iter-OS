import { describe, expect, it } from 'vitest'
import { getMissingBriefingRequirements, isReadyForBriefingPronto, resolveContentStatusStamps } from '@/lib/contentWorkflow'
import type { ContentItem } from '@/types'

const BASE: Partial<ContentItem> = {
  clientId: 'cli_1',
  referenceMonth: '2026-10',
  channels: ['instagram'],
  format: 'post_estatico',
  title: 'Tema',
  internalDueDate: '2026-10-05',
  plannedPublishDate: '2026-10-20',
  editorialResponsibleId: 'usr_1',
  executorId: 'usr_2',
}

describe('getMissingBriefingRequirements', () => {
  it('mínimo comum completo + post estático com conteúdo principal -> nenhuma pendência', () => {
    expect(getMissingBriefingRequirements({ ...BASE, mainContent: 'Texto principal' })).toEqual([])
  })

  it('falta um campo do mínimo comum -> aparece na lista', () => {
    expect(getMissingBriefingRequirements({ ...BASE, executorId: undefined, mainContent: 'x' })).toContain('Executora')
  })

  it('não exige legenda nem CTA (instrução explícita)', () => {
    const missing = getMissingBriefingRequirements({ ...BASE, mainContent: 'x' })
    expect(missing).not.toContain('Legenda')
    expect(missing).not.toContain('CTA')
  })

  it('carrossel sem slides preenchidos -> pendente', () => {
    expect(getMissingBriefingRequirements({ ...BASE, format: 'carrossel', slides: [] })).toContain('Slides preenchidos')
  })

  it('carrossel com slide vazio -> ainda pendente', () => {
    expect(getMissingBriefingRequirements({ ...BASE, format: 'carrossel', slides: [{ id: 's1', text: '  ' }] })).toContain('Slides preenchidos')
  })

  it('carrossel com slides preenchidos -> ok', () => {
    expect(getMissingBriefingRequirements({ ...BASE, format: 'carrossel', slides: [{ id: 's1', text: 'Slide 1' }] })).toEqual([])
  })

  it('reel sem roteiro -> pendente; com roteiro -> ok', () => {
    expect(getMissingBriefingRequirements({ ...BASE, format: 'reel', script: '' })).toContain('Roteiro')
    expect(getMissingBriefingRequirements({ ...BASE, format: 'reel', script: 'Roteiro completo' })).toEqual([])
  })

  it('post estático sem conteúdo principal -> pendente', () => {
    expect(getMissingBriefingRequirements({ ...BASE, format: 'post_estatico', mainContent: '' })).toContain('Conteúdo principal')
  })
})

describe('isReadyForBriefingPronto', () => {
  it('espelha getMissingBriefingRequirements vazio/não vazio', () => {
    expect(isReadyForBriefingPronto({ ...BASE, mainContent: 'x' })).toBe(true)
    expect(isReadyForBriefingPronto({ ...BASE, executorId: undefined })).toBe(false)
  })
})

describe('resolveContentStatusStamps', () => {
  it('entrar em aguardando_aprovacao carimba sentForApprovalAt', () => {
    expect(resolveContentStatusStamps('aguardando_aprovacao')).toHaveProperty('sentForApprovalAt')
  })
  it('entrar em aprovado carimba approvedAt', () => {
    expect(resolveContentStatusStamps('aprovado')).toHaveProperty('approvedAt')
  })
  it('entrar em bloqueado carimba blockedAt', () => {
    expect(resolveContentStatusStamps('bloqueado')).toHaveProperty('blockedAt')
  })
  it('entrar em programado carimba scheduledAt', () => {
    expect(resolveContentStatusStamps('programado')).toHaveProperty('scheduledAt')
  })
  it('entrar em publicado carimba actualPublishDate (data, não timestamp)', () => {
    const stamps = resolveContentStatusStamps('publicado')
    expect(stamps.actualPublishDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('status sem carimbo associado -> objeto vazio', () => {
    expect(resolveContentStatusStamps('em_producao')).toEqual({})
    expect(resolveContentStatusStamps('planejado')).toEqual({})
  })
})
