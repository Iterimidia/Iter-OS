// Script de Fase 1/2 — NÃO EXECUTAR AINDA.
//
// Cria identidades reais no Supabase Auth (auth.users) para os usuários
// fictícios de `seed-test-fixtures.sql`, e vincula cada uma via a coluna
// `public.users.auth_user_id` — coluna que ainda NÃO existe no schema atual
// (é adicionada apenas na Fase 1). Rodar este script hoje falha de
// propósito no preflight, antes de criar qualquer usuário, exatamente por
// essa razão.
//
// Salvaguardas deste script (obrigatórias, não remover):
//   1. Recusa explicitamente o project ref de produção.
//   2. Exige que o alvo seja o project ref de staging conhecido (ou um
//      valor explícito em SUPABASE_STAGING_REF_ALLOWLIST).
//   3. Preflight: confirma que `public.users.auth_user_id` existe e que a
//      Admin API responde, ANTES de criar qualquer usuário.
//   4. Idempotente: se `public.users.auth_user_id` já está preenchido para
//      um seed user, pula — não cria duplicata em auth.users.
//   5. Compensação: se `auth.users` for criado mas o UPDATE em
//      `public.users` falhar, o script apaga o `auth.users` recém-criado
//      (rollback) em vez de deixar uma identidade órfã.
//   6. Termina com código de saída != 0 e um resumo claro se qualquer
//      usuário falhar ou ficar parcialmente processado.
//
// Pré-requisito antes de rodar (Fase 1+):
//   Migration adicionando `auth_user_id uuid unique references auth.users(id)`
//   já aplicada no projeto alvo (staging).
//
// Variáveis de ambiente (NUNCA hardcoded, NUNCA commitadas):
//   SUPABASE_URL              — URL do projeto de STAGING (não produção)
//   SUPABASE_SERVICE_ROLE_KEY — service role key do mesmo projeto
//   SUPABASE_STAGING_REF_ALLOWLIST — opcional, sobrescreve o ref de
//                                    staging esperado (útil se o projeto
//                                    staging for recriado com outro ref)
//
// Uso (quando liberado):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/seed-auth-test-users.mjs

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const PRODUCTION_PROJECT_REF = 'scchivyltudzbjbsveva'
const DEFAULT_STAGING_PROJECT_REF = 'nbsezkskzizxtffhdeer'

const SEED_USERS = [
  { id: 'seed_admin', email: 'seed.admin@teste.itermidia.invalid' },
  { id: 'seed_operacional_restrito', email: 'seed.operacional@teste.itermidia.invalid' },
  { id: 'seed_financeiro', email: 'seed.financeiro@teste.itermidia.invalid' },
  { id: 'seed_usuario_inativo', email: 'seed.inativo@teste.itermidia.invalid' },
]

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Faltando variável de ambiente obrigatória: ${name}`)
    process.exit(1)
  }
  return value
}

function extractProjectRef(supabaseUrl) {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    console.error(`SUPABASE_URL inválida: ${supabaseUrl}`)
    process.exit(1)
  }
}

// Salvaguarda 1 e 2: recusa produção, exige staging explícito.
function assertTargetIsStaging(supabaseUrl) {
  const ref = extractProjectRef(supabaseUrl)
  if (ref === PRODUCTION_PROJECT_REF) {
    console.error(
      `RECUSADO: SUPABASE_URL aponta para o project ref de PRODUÇÃO (${PRODUCTION_PROJECT_REF}). ` +
        'Este script só pode rodar contra o projeto de staging.',
    )
    process.exit(1)
  }
  const allowedRef = process.env.SUPABASE_STAGING_REF_ALLOWLIST || DEFAULT_STAGING_PROJECT_REF
  if (ref !== allowedRef) {
    console.error(
      `RECUSADO: project ref "${ref}" não é o staging esperado ("${allowedRef}"). ` +
        'Se o projeto staging foi recriado com outro ref, defina SUPABASE_STAGING_REF_ALLOWLIST explicitamente.',
    )
    process.exit(1)
  }
  return ref
}

// Salvaguarda 3: preflight — nada é criado em auth.users antes de confirmar
// que o vínculo com public.users vai funcionar.
async function preflight(supabase) {
  const { error } = await supabase.from('users').select('auth_user_id').limit(1)
  if (error) {
    console.error(
      'Preflight falhou: public.users.auth_user_id não existe (ou não está acessível) neste projeto.\n' +
        'Isso é esperado até a migration da Fase 1 que adiciona essa coluna ser aplicada no staging.\n' +
        `Detalhe: ${error.message}`,
    )
    process.exit(1)
  }

  const { error: adminError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (adminError) {
    console.error(`Preflight falhou: Admin API não respondeu (chave/URL incorretas?). Detalhe: ${adminError.message}`)
    process.exit(1)
  }
}

async function main() {
  const url = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const ref = assertTargetIsStaging(url)

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Alvo confirmado: staging (ref ${ref}). Rodando preflight...`)
  await preflight(supabase)
  console.log('Preflight OK.')

  const results = { created: [], skipped: [], failed: [] }

  for (const seedUser of SEED_USERS) {
    // Salvaguarda 4: idempotência — pula quem já está vinculado.
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('id', seedUser.id)
      .maybeSingle()

    if (existingError) {
      results.failed.push({ id: seedUser.id, stage: 'lookup', error: existingError.message })
      continue
    }
    if (!existing) {
      results.failed.push({ id: seedUser.id, stage: 'lookup', error: 'linha não encontrada em public.users — rode o seed de fixtures primeiro' })
      continue
    }
    if (existing.auth_user_id) {
      results.skipped.push({ id: seedUser.id, reason: 'já vinculado', authUserId: existing.auth_user_id })
      continue
    }

    const randomPassword = randomUUID() + randomUUID()
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: seedUser.email,
      password: randomPassword,
      email_confirm: true,
    })

    if (createError) {
      results.failed.push({ id: seedUser.id, stage: 'auth.createUser', error: createError.message })
      continue
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: created.user.id })
      .eq('id', seedUser.id)

    if (updateError) {
      // Salvaguarda 5: compensação — não deixar identidade órfã em auth.users.
      const { error: rollbackError } = await supabase.auth.admin.deleteUser(created.user.id)
      results.failed.push({
        id: seedUser.id,
        stage: 'link (auth.users criado, public.users falhou — rollback tentado)',
        error: updateError.message,
        rollback: rollbackError ? `FALHOU: ${rollbackError.message}` : 'ok',
      })
      continue
    }

    results.created.push({ id: seedUser.id, authUserId: created.user.id })
    console.log(`OK: ${seedUser.email} -> auth_user_id ${created.user.id}`)
  }

  console.log('\nResumo:')
  console.table([...results.created.map((r) => ({ ...r, status: 'criado' })),
    ...results.skipped.map((r) => ({ ...r, status: 'pulado (idempotente)' })),
    ...results.failed.map((r) => ({ ...r, status: 'FALHOU' }))])

  // Salvaguarda 6: sinaliza execução parcial com código de saída != 0.
  if (results.failed.length > 0) {
    console.error(`\n${results.failed.length} usuário(s) falharam. Execução parcial — revise antes de rodar de novo.`)
    process.exitCode = 1
  }
}

main()
