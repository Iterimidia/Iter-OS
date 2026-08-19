// Script de Fase 1/2 — NÃO EXECUTAR AINDA.
//
// Cria identidades reais no Supabase Auth (auth.users) para os
// usuários fictícios de `seed-test-fixtures.sql`, e vincula cada uma
// via a coluna `public.users.auth_user_id` — coluna que ainda NÃO
// existe no schema atual (é adicionada apenas na Fase 1, quando a
// migração para Supabase Auth começa de fato). Rodar este script hoje
// falharia na etapa de UPDATE por essa razão, de propósito: ele existe
// como próximo passo documentado, não como algo a disparar durante a
// Fase 0 (que é somente leitura/preparação, sem tocar em Auth).
//
// Pré-requisitos antes de rodar (Fase 1+):
//   1. Migration adicionando `auth_user_id uuid unique references auth.users(id)`
//      já aplicada no projeto/branch alvo.
//   2. Variáveis de ambiente definidas no shell (NUNCA hardcoded, NUNCA commitadas):
//        SUPABASE_URL              — URL do projeto/branch alvo
//        SUPABASE_SERVICE_ROLE_KEY — service role key (não é a anon/publishable key)
//
// Uso (quando liberado):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/seed-auth-test-users.mjs
//
// O script usa `auth.admin.createUser` com senhas geradas aleatoriamente
// por execução (nunca fixas/reutilizadas) e `email_confirm: true`, já
// que estes são usuários de teste em ambiente isolado — nunca aponte
// isto para o projeto de produção.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const SEED_USERS = [
  { id: 'seed_admin', email: 'seed.admin@teste.itermidia.invalid' },
  { id: 'seed_operacional_restrito', email: 'seed.operacional@teste.itermidia.invalid' },
  { id: 'seed_financeiro', email: 'seed.financeiro@teste.itermidia.invalid' },
]

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Faltando variável de ambiente obrigatória: ${name}`)
    process.exit(1)
  }
  return value
}

async function main() {
  const url = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  for (const seedUser of SEED_USERS) {
    const randomPassword = randomUUID() + randomUUID()

    const { data, error } = await supabase.auth.admin.createUser({
      email: seedUser.email,
      password: randomPassword,
      email_confirm: true,
    })

    if (error) {
      console.error(`Falha ao criar auth.users para ${seedUser.email}:`, error.message)
      continue
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: data.user.id })
      .eq('id', seedUser.id)

    if (updateError) {
      console.error(`Falha ao vincular auth_user_id em public.users (${seedUser.id}):`, updateError.message)
      continue
    }

    console.log(`OK: ${seedUser.email} -> auth_user_id ${data.user.id}`)
  }
}

main()
