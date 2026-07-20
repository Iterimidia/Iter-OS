/**
 * Autenticação mock — valida e-mail/senha contra os usuários do data store e
 * guarda apenas o id do usuário logado. Trocar por Supabase Auth depois:
 * `login` vira `supabase.auth.signInWithPassword`, e `currentUserId` vira a
 * sessão retornada por `supabase.auth.getSession` / `onAuthStateChange`.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { User } from '@/types'
import { useDataStore } from '@/data/store'

export type LoginResult = { ok: true } | { ok: false; error: string }

interface AuthState {
  currentUserId: string | null
  login: (email: string, password: string) => LoginResult
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUserId: null,
      login: (email, password) => {
        const users = useDataStore.getState().users
        const user = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase())

        if (!user) return { ok: false, error: 'E-mail não encontrado.' }
        if (!user.active) return { ok: false, error: 'Usuário inativo. Fale com o administrador.' }
        if (user.password !== password) return { ok: false, error: 'Senha incorreta.' }

        set({ currentUserId: user.id })
        return { ok: true }
      },
      logout: () => set({ currentUserId: null }),
    }),
    {
      name: 'iteros-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export function useCurrentUser(): User | null {
  const currentUserId = useAuthStore((s) => s.currentUserId)
  return useDataStore((s) => s.users.find((u) => u.id === currentUserId) ?? null)
}
