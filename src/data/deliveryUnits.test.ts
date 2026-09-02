import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useDataStore } from '@/data/store'
import type { DeliveryPlanItem, DeliveryUnit } from '@/types'

function makePlanItem(overrides: Partial<DeliveryPlanItem> = {}): DeliveryPlanItem {
  return { id: 'dplan_1', clientId: 'cli_1', label: 'Posts', monthlyQuantity: 4, createdAt: '2026-01-01', ...overrides }
}

function makeUnit(overrides: Partial<DeliveryUnit> = {}): DeliveryUnit {
  return { id: 'dunit_x', planItemId: 'dplan_1', clientId: 'cli_1', month: '2026-09', unitIndex: 1, status: 'pendente', createdAt: '2026-01-01', ...overrides }
}

function snakeUnit(u: DeliveryUnit) {
  return { id: u.id, plan_item_id: u.planItemId, client_id: u.clientId, month: u.month, unit_index: u.unitIndex, status: u.status, created_at: u.createdAt }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
})

// A garantia de integridade real (nenhuma quantidade de abas concorrentes
// produz monthly_quantity menor que o número real de unidades) é do Postgres
// — a RPC trava a linha (ver migration 20260902130000_delivery_plan_item_quantity_rpc.sql)
// e isso só se prova de fato contra o staging real (ver testes de integração
// da Fase 4). Aqui protegemos o que É responsabilidade do client: chamar a
// RPC certa, não duplicar chamada à toa quando já sabe a resposta, e nunca
// aplicar localmente uma mudança que o banco recusou.
describe('reconcileDeliveryUnits — idempotência e concorrência do lado do client', () => {
  it('não chama a RPC se já existem localmente unidades suficientes pro mês (otimização, não a garantia de integridade)', async () => {
    const plan = makePlanItem({ monthlyQuantity: 2 })
    const units = [makeUnit({ id: 'u1', unitIndex: 1 }), makeUnit({ id: 'u2', unitIndex: 2 })]
    useDataStore.setState({ deliveryPlanItems: [plan], deliveryUnits: units })

    const result = await useDataStore.getState().reconcileDeliveryUnits(plan.id, '2026-09')

    expect(result.ok).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('duas chamadas concorrentes pro mesmo (planItemId, month) reaproveitam a mesma chamada de RPC em voo, em vez de duplicar o round-trip', async () => {
    const plan = makePlanItem({ monthlyQuantity: 3 })
    useDataStore.setState({ deliveryPlanItems: [plan], deliveryUnits: [] })

    let resolveRpc: (v: unknown) => void = () => {}
    supabase.rpc.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRpc = resolve
        }),
    )

    const call1 = useDataStore.getState().reconcileDeliveryUnits(plan.id, '2026-09')
    const call2 = useDataStore.getState().reconcileDeliveryUnits(plan.id, '2026-09')

    expect(supabase.rpc).toHaveBeenCalledTimes(1)

    resolveRpc({ data: [1, 2, 3].map((i) => snakeUnit(makeUnit({ id: `u${i}`, unitIndex: i }))), error: null })

    const [r1, r2] = await Promise.all([call1, call2])
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it('aumento de quantidade dispara a RPC e aplica as unidades autoritativas retornadas pelo servidor', async () => {
    const plan = makePlanItem({ monthlyQuantity: 3 })
    useDataStore.setState({ deliveryPlanItems: [plan], deliveryUnits: [] })

    const authoritative = [1, 2, 3].map((i) => snakeUnit(makeUnit({ id: `u${i}`, unitIndex: i })))
    supabase.rpc.mockResolvedValueOnce({ data: authoritative, error: null })

    const result = await useDataStore.getState().reconcileDeliveryUnits(plan.id, '2026-09')

    expect(result.ok).toBe(true)
    expect(useDataStore.getState().deliveryUnits.filter((u) => u.planItemId === plan.id)).toHaveLength(3)
    expect(supabase.rpc).toHaveBeenCalledWith('reconcile_delivery_units', { p_plan_item_id: plan.id, p_month: '2026-09' })
  })
})

describe('updateDeliveryPlanItem — mudança de monthlyQuantity sempre passa pela RPC travada no banco', () => {
  it('redução conflitante (RPC recusa) NÃO é aplicada localmente e o erro é reportado', async () => {
    const plan = makePlanItem({ monthlyQuantity: 5 })
    useDataStore.setState({ deliveryPlanItems: [plan] })

    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'reduziria abaixo das entregas já existentes', code: 'P0001' } })

    const result = await useDataStore.getState().updateDeliveryPlanItem(plan.id, { monthlyQuantity: 2 })

    expect(result.ok).toBe(false)
    expect(useDataStore.getState().deliveryPlanItems.find((p) => p.id === plan.id)?.monthlyQuantity).toBe(5)
  })

  it('aumento aceito pela RPC atualiza o item contratado com o valor autoritativo devolvido pelo banco', async () => {
    const plan = makePlanItem({ monthlyQuantity: 3 })
    useDataStore.setState({ deliveryPlanItems: [plan] })

    supabase.rpc.mockResolvedValueOnce({
      data: { id: plan.id, client_id: plan.clientId, label: plan.label, monthly_quantity: 8, created_at: plan.createdAt },
      error: null,
    })

    const result = await useDataStore.getState().updateDeliveryPlanItem(plan.id, { monthlyQuantity: 8 })

    expect(result.ok).toBe(true)
    expect(useDataStore.getState().deliveryPlanItems.find((p) => p.id === plan.id)?.monthlyQuantity).toBe(8)
    expect(supabase.rpc).toHaveBeenCalledWith('update_delivery_plan_item_quantity', { p_plan_item_id: plan.id, p_new_quantity: 8 })
  })
})
