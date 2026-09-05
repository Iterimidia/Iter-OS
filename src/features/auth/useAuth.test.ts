import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'

// `useAuth.ts` assina `supabase.auth.onAuthStateChange` uma única vez, no
// carregamento do módulo (fora de qualquer função) — captura o callback AQUI,
// antes de qualquer `beforeEach` limpar o histórico de chamadas do mock.
const authChangeCallback = supabase.auth.onAuthStateChange.mock.calls[0]?.[0] as (event: string, session: unknown) => void

beforeEach(() => {
  resetSupabaseMock()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

describe('login', () => {
  it('login válido (credenciais aceitas pelo Auth) retorna ok', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { user: { id: 'auth_1' } } },
      error: null,
    })

    const result = await useAuthStore.getState().login('user@iter.invalid', 'senha-correta')

    expect(result.ok).toBe(true)
  })

  it('login inválido (credenciais recusadas) retorna mensagem genérica, sem expor o motivo interno', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    })

    const result = await useAuthStore.getState().login('user@iter.invalid', 'senha-errada')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('E-mail ou senha inválidos.')
  })
})

describe('logout', () => {
  it('logout encerra a sessão via supabase.auth.signOut', async () => {
    await useAuthStore.getState().logout()
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('logoutWithError seta a mensagem ANTES de encerrar a sessão, pra sobreviver ao signOut', async () => {
    await useAuthStore.getState().logoutWithError('Sua conta está inativa ou sem perfil liberado no sistema.')
    expect(useAuthStore.getState().lastError).toBe('Sua conta está inativa ou sem perfil liberado no sistema.')
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('sessão restaurada (onAuthStateChange)', () => {
  it('captura o callback de inscrição no carregamento do módulo', () => {
    expect(typeof authChangeCallback).toBe('function')
  })

  it('evento com sessão existente (restauração do localStorage, ou INITIAL_SESSION) marca signed_in', () => {
    const restoredSession = { user: { id: 'auth_restored' } }
    authChangeCallback('INITIAL_SESSION', restoredSession)
    expect(useAuthStore.getState().status).toBe('signed_in')
    expect(useAuthStore.getState().session).toBe(restoredSession)
  })

  it('evento sem sessão marca signed_out e não deixa uma sessão antiga pendurada', () => {
    authChangeCallback('SIGNED_OUT', null)
    expect(useAuthStore.getState().status).toBe('signed_out')
    expect(useAuthStore.getState().session).toBeNull()
  })
})
