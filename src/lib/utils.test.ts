import { describe, expect, it } from 'vitest'
import { resolveCompletedAtOnStatusChange, resolvePaidDateOnStatusChange, todayIso } from '@/lib/utils'

// Bug real corrigido na Fase 7 (pós-revisão Codex): entrar em "pago"/"concluído"
// vindo de OUTRO status precisa sempre carimbar a data de HOJE, mesmo que o
// campo ainda carregue um valor antigo de um ciclo anterior (pago -> pendente
// -> pago) -- o valor antigo só é preservado quando o status JÁ ERA pago/
// concluído e continua sendo (edição de outro campo). Sair do status precisa
// limpar o campo com `null` explícito -- `undefined` nunca chega a limpar a
// coluna no Supabase (é removido do JSON antes do PATCH/POST).
describe('resolvePaidDateOnStatusChange', () => {
  it('entrando em pago a partir de outro status -> hoje, mesmo com paidDate antigo/stale no registro', () => {
    expect(resolvePaidDateOnStatusChange('pendente', '2020-01-01', 'pago')).toBe(todayIso())
    expect(resolvePaidDateOnStatusChange(undefined, undefined, 'pago')).toBe(todayIso())
  })

  it('permanecendo em pago (edição de outro campo) -> preserva a data existente', () => {
    expect(resolvePaidDateOnStatusChange('pago', '2025-03-01', 'pago')).toBe('2025-03-01')
  })

  it('saindo de pago -> null explícito (nunca undefined)', () => {
    expect(resolvePaidDateOnStatusChange('pago', '2025-03-01', 'pendente')).toBeNull()
  })

  it('permanecendo fora de pago -> preserva o que já tinha (ou null se nunca teve)', () => {
    expect(resolvePaidDateOnStatusChange('pendente', undefined, 'vencido')).toBeNull()
  })

  it('ciclo completo pendente -> pago -> pendente -> pago: a 2ª entrada em pago NÃO reaproveita a data da 1ª', () => {
    const first = resolvePaidDateOnStatusChange('pendente', undefined, 'pago')
    expect(first).toBe(todayIso())

    const leftPago = resolvePaidDateOnStatusChange('pago', first, 'pendente')
    expect(leftPago).toBeNull()

    // Mesmo que `leftPago` (null) fosse ignorado e o valor antigo `first`
    // continuasse fisicamente no registro (bug relatado), a regra olha pro
    // status ANTERIOR ('pendente', não 'pago') e recalcula hoje de novo --
    // nunca reaproveita.
    const secondEntry = resolvePaidDateOnStatusChange('pendente', first, 'pago')
    expect(secondEntry).toBe(todayIso())
  })
})

describe('resolveCompletedAtOnStatusChange', () => {
  it('entrando em concluído a partir de outro status -> hoje, mesmo com completedAt antigo/stale', () => {
    expect(resolveCompletedAtOnStatusChange('em_andamento', '2020-01-01', 'concluido')).toBe(todayIso())
    expect(resolveCompletedAtOnStatusChange(undefined, undefined, 'concluido')).toBe(todayIso())
  })

  it('permanecendo concluído (edição de outro campo) -> preserva a data existente', () => {
    expect(resolveCompletedAtOnStatusChange('concluido', '2025-05-10', 'concluido')).toBe('2025-05-10')
  })

  it('reabrindo (saindo de concluído) -> null explícito (nunca undefined)', () => {
    expect(resolveCompletedAtOnStatusChange('concluido', '2025-05-10', 'em_andamento')).toBeNull()
  })

  it('ciclo em_andamento -> concluído -> em_andamento: reabrir limpa de verdade, e concluir de novo não reaproveita', () => {
    const concluded = resolveCompletedAtOnStatusChange('em_andamento', undefined, 'concluido')
    expect(concluded).toBe(todayIso())

    const reopened = resolveCompletedAtOnStatusChange('concluido', concluded, 'em_andamento')
    expect(reopened).toBeNull()

    const concludedAgain = resolveCompletedAtOnStatusChange('em_andamento', concluded, 'concluido')
    expect(concludedAgain).toBe(todayIso())
  })
})
