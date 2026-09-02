import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { type PgResponse, deferred, enqueue, resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { RequireAuth } from '@/app/guards'
import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'

const IDENTITY_A = 'auth_user_a'

// As mesmas 12 tabelas (+ users) que `initialize()` busca de verdade em
// store.ts, na mesma ordem do Promise.all -- usado pelos testes que rodam o
// initialize() REAL (não um fake), pra dar uma resposta "sucesso, vazio" a
// cada uma sem precisar repetir a lista em cada teste.
const OTHER_TABLES = [
  'clients',
  'projects',
  'tasks',
  'calendar_events',
  'financial_entries',
  'leads',
  'content_items',
  'files',
  'delivery_plan_items',
  'delivery_units',
  'dashboard_cards',
  'app_settings',
]

function enqueueAllTablesSuccess() {
  enqueue('users', { data: [], error: null })
  for (const t of OTHER_TABLES) enqueue(t, { data: [], error: null })
}

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

  it('clicar em "Tentar novamente" roda o initialize() REAL do store; loadError só limpa se/quando a carga terminar com sucesso', async () => {
    // 1) carga inicial bem-sucedida de A -- estabelece currentIdentity=A e
    // loadedIdentityId=A por dentro do store (variáveis de módulo que só
    // `initialize()` real toca; um fake nunca exercitaria essa parte).
    enqueueAllTablesSuccess()
    await useDataStore.getState().initialize(IDENTITY_A)
    expect(useDataStore.getState().loadedIdentityId).toBe(IDENTITY_A)
    expect(useDataStore.getState().loadError).toBeNull()

    // 2) alguma falha subsequente aconteceu (não importa qual mecanismo
    // exato -- o que este teste prova é o comportamento do retry em si).
    useDataStore.setState({ loadError: 'Falha anterior (simulada).' })
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY_A } } as never })

    renderPrivateTree()
    expect(screen.getByText('Falha anterior (simulada).')).toBeInTheDocument()

    // 3) prepara o retry com 'clients' deliberadamente pendurado -- é o
    // initialize() DE VERDADE quem vai rodar ao clicar, não um substituto.
    const clientsDeferred = deferred<PgResponse>()
    enqueue('users', { data: [], error: null })
    enqueue('clients', clientsDeferred.promise)
    for (const t of OTHER_TABLES.filter((t) => t !== 'clients')) enqueue(t, { data: [], error: null })

    const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
    retryButton.click()

    // 4) mesmo depois de dar tempo pras outras 12 tabelas resolverem, o
    // Promise.all inteiro continua pendurado em 'clients' -- loadError NÃO
    // pode ter sido limpo no início do retry (regressão da 5ª rodada), e a
    // árvore privada continua bloqueada.
    await new Promise((r) => setTimeout(r, 20))
    expect(useDataStore.getState().loadError).toBe('Falha anterior (simulada).')
    expect(screen.getByText('Falha anterior (simulada).')).toBeInTheDocument()
    expect(screen.queryByText('CONTEUDO_PRIVADO')).not.toBeInTheDocument()

    // 5) só agora resolve a última consulta pendente -- e só então, de uma
    // vez (atomicamente), o novo estado é publicado.
    clientsDeferred.resolve({ data: [], error: null })
    await waitFor(() => expect(screen.getByText('CONTEUDO_PRIVADO')).toBeInTheDocument())
    expect(useDataStore.getState().loadError).toBeNull()
    expect(useDataStore.getState().initialized).toBe(true)
    expect(useDataStore.getState().loadedIdentityId).toBe(IDENTITY_A)
  })
})
