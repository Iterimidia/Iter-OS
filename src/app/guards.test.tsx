import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { RequireAuth } from '@/app/guards'
import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'

const IDENTITY_A = 'auth_user_a'

function renderPrivateTree() {
  return render(
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route path="/login" element={<div>TELA_DE_LOGIN</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/privado" element={<div>CONTEUDO_PRIVADO</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  resetSupabaseMock()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
  useDataStore.getState().reset()
})

// Estes testes protegem exatamente as duas garantias de segurança da UI que
// já exigiram correção pós-revisão nas Fases 3-5: (1) nunca renderizar a
// árvore privada com dados de uma identidade diferente da sessão atual
// (`loadedIdentityId` vs `session.user.id`), e (2) nunca "vazar" pra frente
// de um `loadError` só porque uma nova tentativa começou, antes dela
// realmente confirmar sucesso.

describe('RequireAuth — sessão', () => {
  it('sem sessão (signed_out) redireciona pro /login', () => {
    useAuthStore.setState({ status: 'signed_out' })
    renderPrivateTree()
    expect(screen.getByText('TELA_DE_LOGIN')).toBeInTheDocument()
  })

  it('sessão presente mas dados ainda não prontos (dataReady=false) mostra loading, nunca o conteúdo privado', () => {
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_A } } as never })
    useDataStore.setState({ loadedIdentityId: null })
    renderPrivateTree()
    expect(screen.queryByText('CONTEUDO_PRIVADO')).not.toBeInTheDocument()
    expect(screen.queryByText('TELA_DE_LOGIN')).not.toBeInTheDocument()
  })

  it('dataReady com perfil encontrado renderiza o conteúdo privado', () => {
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_A } } as never })
    useDataStore.setState({ loadedIdentityId: IDENTITY_A, users: [makeUser({ authUserId: IDENTITY_A, active: true })] })
    renderPrivateTree()
    expect(screen.getByText('CONTEUDO_PRIVADO')).toBeInTheDocument()
  })
})

describe('RequireAuth — troca de identidade sem vazamento de dados', () => {
  it('sessão já é do usuário B mas os dados carregados ainda são do usuário A -> bloqueia (não mostra nem o conteúdo de A, nem assume B)', () => {
    const IDENTITY_B = 'auth_user_b'
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_B } } as never })
    // loadedIdentityId ainda aponta pro dono anterior (A) -- initialize(B)
    // "está em voo" mas não terminou; os arrays ainda podem conter dados de A.
    useDataStore.setState({
      loadedIdentityId: IDENTITY_A,
      users: [makeUser({ id: 'usr_a', authUserId: IDENTITY_A }), makeUser({ id: 'usr_b', authUserId: IDENTITY_B })],
    })
    renderPrivateTree()
    expect(screen.queryByText('CONTEUDO_PRIVADO')).not.toBeInTheDocument()
  })
})

describe('RequireAuth — usuário sem perfil válido (inativo OU sem linha em users, mesma checagem)', () => {
  it('dataReady mas useCurrentUser() não encontra a linha -> dispara logoutWithError com mensagem clara', async () => {
    const logoutWithError = vi.fn()
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_A } } as never, logoutWithError })
    // RLS (Fase 2) devolve zero linhas em `users` tanto pra usuário inativo
    // quanto pra usuário sem perfil vinculado -- dos dois lados, o array
    // carregado não tem a linha do usuário logado.
    useDataStore.setState({ loadedIdentityId: IDENTITY_A, users: [] })

    renderPrivateTree()

    await waitFor(() => expect(logoutWithError).toHaveBeenCalledTimes(1))
    expect(logoutWithError.mock.calls[0][0]).toMatch(/inativa|sem perfil/i)
  })
})

describe('RequireAuth — loadError permanece bloqueando até uma carga bem-sucedida (correção da 5ª rodada)', () => {
  it('mostra a tela de erro (não o conteúdo privado) enquanto loadError existir', () => {
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_A } } as never })
    useDataStore.setState({ loadedIdentityId: null, loadError: 'Não foi possível carregar os dados.' })

    renderPrivateTree()

    expect(screen.getByText('Não foi possível carregar os dados.')).toBeInTheDocument()
    expect(screen.queryByText('CONTEUDO_PRIVADO')).not.toBeInTheDocument()
  })

  it('clicar em "Tentar novamente" chama initialize(identityId) de novo, e uma nova falha mantém o bloqueio (não libera a árvore privada)', async () => {
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_A } } as never })
    useDataStore.setState({ loadedIdentityId: null, loadError: 'Falha original.' })

    const retryInitialize = vi.fn(async () => {
      // Simula uma segunda tentativa que também falha: store.ts real
      // substitui loadError por uma nova mensagem, nunca limpa cedo demais.
      useDataStore.setState({ loadError: 'Falha na nova tentativa.' })
    })
    useDataStore.setState({ initialize: retryInitialize })

    renderPrivateTree()
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
    retryButton.click()

    await waitFor(() => expect(retryInitialize).toHaveBeenCalledWith(IDENTITY_A))
    await waitFor(() => expect(screen.getByText('Falha na nova tentativa.')).toBeInTheDocument())
    expect(screen.queryByText('CONTEUDO_PRIVADO')).not.toBeInTheDocument()
  })
})
