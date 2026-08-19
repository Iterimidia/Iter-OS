// Export manual de backup do banco de produção do Iter OS.
//
// Por que este script existe: a organização Supabase do projeto está no
// plano Free, que NÃO inclui Point-in-Time Recovery (PITR). Sem PITR, um
// erro de escrita/exclusão em massa só é recuperável se existir um
// snapshot manual recente — este script é essa rede de segurança até haver
// upgrade de plano ou um mecanismo de backup gerenciado.
//
// A coluna `users.password` é deliberadamente EXCLUÍDA do export: é texto
// plano (vulnerabilidade já documentada para remoção nas próximas fases) e
// não deve existir duplicada em arquivos de backup espalhados pelo disco.
//
// Salvaguardas (obrigatórias, não remover):
//   - O destino padrão é fora deste repositório (pasta no $HOME do usuário),
//     nunca a raiz do repo — mesmo que alguém rode o script sem argumentos
//     de dentro da pasta do projeto.
//   - Se o destino resolvido (padrão OU passado por argumento) cair dentro
//     de um repositório git, o script recusa rodar, a menos que
//     ALLOW_BACKUP_IN_REPO=1 seja setado explicitamente. Isso é a primeira
//     camada de defesa; `.gitignore` (backup-*/, .local-backups/) é a
//     segunda, para o caso raro de alguém forçar essa variável.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/backup-export.mjs [pasta-de-saida]
//
// Saída: um arquivo JSON por tabela, dentro de uma pasta com timestamp
// (backup-YYYY-MM-DDTHH-mm-ss/), por padrão em ~/iteros-backups/.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TABLES = [
  'clients',
  'projects',
  'tasks',
  'calendar_events',
  'financial_entries',
  'leads',
  'content_items',
  'files',
  'dashboard_cards',
  'app_settings',
  'delivery_plan_items',
  'delivery_units',
]

// `users` é tratado à parte para excluir a coluna `password`.
const USERS_COLUMNS =
  'id,name,email,role,job_title,avatar_initials,avatar_color,active,allowed_bases,allowed_areas,allowed_actions,allowed_client_ids,allowed_dashboard_cards,created_at'

const DEFAULT_OUTPUT_ROOT = path.join(os.homedir(), 'iteros-backups')

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Faltando variável de ambiente obrigatória: ${name}`)
    process.exit(1)
  }
  return value
}

function isInsideGitRepo(targetPath) {
  let dir = path.resolve(targetPath)
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return true
    const parent = path.dirname(dir)
    if (parent === dir) return false
    dir = parent
  }
}

function resolveOutputRoot() {
  const requested = process.argv[2]
  const outRoot = requested ? path.resolve(requested) : DEFAULT_OUTPUT_ROOT

  if (isInsideGitRepo(outRoot) && process.env.ALLOW_BACKUP_IN_REPO !== '1') {
    console.error(
      `RECUSADO: o destino "${outRoot}" fica dentro de um repositório git. ` +
        'Backups contêm dados reais de produção e não devem entrar no controle de versão.\n' +
        'Rode sem argumento (usa ~/iteros-backups por padrão) ou passe uma pasta fora de qualquer repo git.\n' +
        'Se você sabe o que está fazendo, defina ALLOW_BACKUP_IN_REPO=1 para forçar — mas o .gitignore deste ' +
        'repo já bloqueia backup-*/ e .local-backups/ como segunda camada.',
    )
    process.exit(1)
  }

  return outRoot
}

async function main() {
  const url = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const outputRoot = resolveOutputRoot()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(outputRoot, `backup-${timestamp}`)
  fs.mkdirSync(outDir, { recursive: true })

  const summary = {}

  const { data: usersData, error: usersError } = await supabase.from('users').select(USERS_COLUMNS)
  if (usersError) {
    console.error('Falha ao exportar users:', usersError.message)
    process.exit(1)
  }
  fs.writeFileSync(path.join(outDir, 'users.json'), JSON.stringify(usersData, null, 2))
  summary.users = usersData.length

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`Falha ao exportar ${table}:`, error.message)
      process.exit(1)
    }
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(data, null, 2))
    summary[table] = data.length
  }

  fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify({ timestamp, rowCounts: summary }, null, 2))

  console.log(`Backup salvo em: ${outDir}`)
  console.table(summary)
}

main()
