import { describe, expect, it } from 'vitest'
import {
  canAccessBase,
  canAccessClient,
  canPerformAction,
  canViewArea,
} from '@/lib/permissions'
import { makeUser } from '@/test/fixtures'

// Estes testes protegem a regra central do produto (README + comentário de
// topo de permissions.ts): "nenhum usuário deve ver base/área/ação que não
// esteja liberada", e a semântica de UNIÃO entre papel e overrides —
// `allowedBases`/`allowedAreas`/`allowedActions`/`allowedClientIds` só
// ADICIONAM ao que o papel já dá por padrão, nunca subtraem. Um regressão
// aqui vazaria ou bloquearia dado de verdade em produção, silenciosamente.

describe('canAccessBase', () => {
  it('admin acessa qualquer base mesmo sem allowedBases', () => {
    const admin = makeUser({ role: 'admin', allowedBases: [] })
    expect(canAccessBase(admin, 'geral')).toBe(true)
    expect(canAccessBase(admin, 'operacional')).toBe(true)
    expect(canAccessBase(admin, 'criativo')).toBe(true)
  })

  it('papel operacional acessa a base operacional por default, sem override', () => {
    const user = makeUser({ role: 'operacional', allowedBases: [] })
    expect(canAccessBase(user, 'operacional')).toBe(true)
  })

  it('usuario_limitado não acessa nenhuma base por default', () => {
    const user = makeUser({ role: 'usuario_limitado', allowedBases: [] })
    expect(canAccessBase(user, 'geral')).toBe(false)
    expect(canAccessBase(user, 'operacional')).toBe(false)
    expect(canAccessBase(user, 'criativo')).toBe(false)
  })

  it('allowedBases é uma UNIÃO (adiciona) — nunca restringe o que o papel já dá', () => {
    // operacional já tem 'operacional' por default; um allowedBases vazio
    // (ou com outra base) não pode revogar isso.
    const user = makeUser({ role: 'operacional', allowedBases: [] })
    expect(canAccessBase(user, 'operacional')).toBe(true)

    // allowedBases concede uma base A MAIS que o papel não dá por padrão.
    const withExtra = makeUser({ role: 'operacional', allowedBases: ['criativo'] })
    expect(canAccessBase(withExtra, 'criativo')).toBe(true)
    expect(canAccessBase(withExtra, 'geral')).toBe(false)
  })
})

describe('canViewArea', () => {
  it('nega uma área de uma base que o usuário nem acessa, mesmo se a área está em allowedAreas', () => {
    // Guarda contra um bug plausível: liberar uma área "solta" sem checar a
    // base dela primeiro.
    const user = makeUser({ role: 'usuario_limitado', allowedBases: [], allowedAreas: ['operacional:financeiro'] })
    expect(canViewArea(user, 'operacional:financeiro')).toBe(false)
  })

  it('financeiro vê a área financeiro por default (base liberada automaticamente)', () => {
    const user = makeUser({ role: 'financeiro' })
    expect(canViewArea(user, 'operacional:financeiro')).toBe(true)
  })

  it('operacional (sem override) NÃO vê a área financeiro', () => {
    const user = makeUser({ role: 'operacional' })
    expect(canViewArea(user, 'operacional:financeiro')).toBe(false)
  })

  it('área inexistente nunca é considerada visível', () => {
    const admin = makeUser({ role: 'admin' })
    expect(canViewArea(admin, 'area:que:nao:existe')).toBe(false)
  })

  it('allowedAreas concede uma área extra sem remover as do papel', () => {
    const user = makeUser({ role: 'operacional', allowedAreas: ['operacional:financeiro'] })
    expect(canViewArea(user, 'operacional:financeiro')).toBe(true)
    // área default do papel continua liberada
    expect(canViewArea(user, 'operacional:clientes')).toBe(true)
  })
})

describe('canPerformAction', () => {
  it('admin pode qualquer ação', () => {
    const admin = makeUser({ role: 'admin', allowedActions: [] })
    expect(canPerformAction(admin, 'excluir')).toBe(true)
    expect(canPerformAction(admin, 'aprovar')).toBe(true)
    expect(canPerformAction(admin, 'ver_financeiro')).toBe(true)
  })

  it('criativo tem criar/editar por default mas não aprovar nem excluir', () => {
    const user = makeUser({ role: 'criativo' })
    expect(canPerformAction(user, 'criar')).toBe(true)
    expect(canPerformAction(user, 'editar')).toBe(true)
    expect(canPerformAction(user, 'aprovar')).toBe(false)
    expect(canPerformAction(user, 'excluir')).toBe(false)
  })

  it('gestao_criativa tem aprovar por default (positivo, sem regressão do gate aprovar+editar)', () => {
    const user = makeUser({ role: 'gestao_criativa' })
    expect(canPerformAction(user, 'aprovar')).toBe(true)
    expect(canPerformAction(user, 'editar')).toBe(true)
  })

  it('allowedActions concede aprovar sem conceder editar (caso real corrigido na Fase 5: UI precisa checar os dois)', () => {
    // usuario_limitado só tem 'visualizar' por default; liberar 'aprovar'
    // manualmente não libera 'editar' -- é exatamente o cenário que a
    // correção pós-revisão da Fase 5 endereçou nas telas de aprovação.
    const user = makeUser({ role: 'usuario_limitado', allowedActions: ['aprovar'] })
    expect(canPerformAction(user, 'aprovar')).toBe(true)
    expect(canPerformAction(user, 'editar')).toBe(false)
  })

  describe('ver_financeiro', () => {
    it('papel financeiro vê financeiro por default', () => {
      const user = makeUser({ role: 'financeiro' })
      expect(canPerformAction(user, 'ver_financeiro')).toBe(true)
    })

    it('papel operacional NÃO vê financeiro sem override', () => {
      const user = makeUser({ role: 'operacional' })
      expect(canPerformAction(user, 'ver_financeiro')).toBe(false)
    })

    it('ver_financeiro liberado por override não libera outras ações financeiras à toa (ex: excluir continua exigindo a ação própria)', () => {
      const user = makeUser({ role: 'usuario_limitado', allowedActions: ['ver_financeiro'] })
      expect(canPerformAction(user, 'ver_financeiro')).toBe(true)
      expect(canPerformAction(user, 'excluir')).toBe(false)
    })
  })
})

describe('canAccessClient (allowed_client_ids)', () => {
  it('admin acessa qualquer cliente independente de allowedClientIds', () => {
    const admin = makeUser({ role: 'admin', allowedClientIds: [] })
    expect(canAccessClient(admin, 'cliente_qualquer')).toBe(true)
  })

  it("allowedClientIds 'all' libera qualquer cliente", () => {
    const user = makeUser({ role: 'operacional', allowedClientIds: 'all' })
    expect(canAccessClient(user, 'cliente_qualquer')).toBe(true)
  })

  it('usuário restrito a uma lista só acessa os clientes daquela lista', () => {
    const user = makeUser({ role: 'operacional', allowedClientIds: ['cliente_a'] })
    expect(canAccessClient(user, 'cliente_a')).toBe(true)
    expect(canAccessClient(user, 'cliente_b')).toBe(false)
  })

  it('lista vazia de allowedClientIds bloqueia todos os clientes (não é tratada como "all")', () => {
    const user = makeUser({ role: 'operacional', allowedClientIds: [] })
    expect(canAccessClient(user, 'cliente_a')).toBe(false)
  })
})
