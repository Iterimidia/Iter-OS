/**
 * Autenticação real via Supabase Auth (Fase 3).
 *
 * `status` reflete a sessão do GoTrue: começa em 'loading' até o cliente
 * resolver (ou restaurar do localStorage) a sessão existente, depois vira
 * 'signed_in' ou 'signed_out'. `login` só cuida do Auth em si (credenciais
 * válidas); se a conta está `active` e tem perfil em `public.users` é
 * decidido só depois, em src/app/guards.tsx (RequireAuth), quando o
 * restante dos dados já carregou — é a RLS da Fase 2 quem de fato barra um
 * usuário inativo (não devolve nem a própria linha), e `useCurrentUser`
 * só encontra, no array de `users` de `useDataStore`, a linha cujo
 * `auth_user_id` bate com o usuário da sessão atual.
 */
import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { User } from '@/types'
import { useDataStore } from '@/data/store'
import { supabase } from '@/lib/supabaseClient'

export type LoginResult = { ok: true } | { ok: false; error: string }
type AuthStatus = 'loading' | 'signed_in' | 'signed_out'

interface AuthState {
  status: AuthStatus
  session: Session | null
  /** Mensagem de erro para exibir na próxima renderização do login (ex: sessão encerrada por perfil inválido). */
  lastError: string | null
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  logoutWithError: (message: string) => Promise<void>
  clearLastError: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  session: null,
  lastError: null,

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error || !data.session) {
        if (error?.status === 429) return { ok: false, error: 'Muitas tentativas de login. Aguarde um instante e tente novamente.' }
        return { ok: false, error: 'E-mail ou senha inválidos.' }
      }
      // Login no Auth não sabe nada sobre `active` nem sobre o perfil interno
      // existir de fato — checar isso aqui rodaria em paralelo com
      // onAuthStateChange (que já dispara pro 'signed_in' assim que o token
      // sai, antes desta função sequer terminar) e disputaria a mesma
      // decisão com a RequireAuth. Deixa só a RequireAuth cuidar disso, depois
      // que os dados carregam — um único lugar decide, sem corrida.
      return { ok: true }
    } catch {
      return { ok: false, error: 'Não foi possível conectar. Verifique sua internet e tente novamente.' }
    }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[Supabase Auth] Falha ao encerrar sessão:', error)
      window.alert(`Não foi possível encerrar a sessão corretamente. Detalhe: ${error.message}`)
    }
  },

  logoutWithError: async (message) => {
    set({ lastError: message })
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[Supabase Auth] Falha ao encerrar sessão (logoutWithError):', error)
  },

  clearLastError: () => set({ lastError: null }),
}))

// `onAuthStateChange` dispara imediatamente com a sessão atual ao inscrever
// (evento INITIAL_SESSION do supabase-js v2) — cobre tanto a resolução
// inicial quanto a restauração de sessão após recarregar a página, sem
// precisar de uma chamada separada a getSession().
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session, status: session ? 'signed_in' : 'signed_out' })
})

export function useCurrentUser(): User | null {
  const session = useAuthStore((s) => s.session)
  return useDataStore((s) => (session ? (s.users.find((u) => u.authUserId === session.user.id) ?? null) : null))
}
