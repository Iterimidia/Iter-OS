// Export manual de backup do banco de produção do Iter OS.
//
// Por que este script existe: a organização Supabase do projeto está
// no plano Free, que NÃO inclui Point-in-Time Recovery (PITR). Sem
// PITR, um erro de escrita/exclusão em massa só é recuperável se
// existir um snapshot manual recente — este script é essa rede de
// segurança até haver upgrade de plano ou um mecanismo de backup
// gerenciado.
//
// A coluna `users.password` é deliberadamente EXCLUÍDA do export: é
// texto plano (vulnerabilidade já documentada para remoção nas
// próximas fases) e não deve existir duplicada em arquivos de backup
// espalhados pelo disco/repos.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/backup-export.mjs [pasta-de-saida]
//
// Saída: um arquivo JSON por tabela, dentro de uma pasta com timestamp
// (backup-YYYY-MM-DDTHH-mm-ss/). Este script não apaga backups
// antigos nem envia para armazenamento externo — isso é
// responsabilidade de quem o executa (ver supabase/README.md para a
// recomendação de destino durável).

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
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

  const outRoot = process.argv[2] || '.'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(outRoot, `backup-${timestamp}`)
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
