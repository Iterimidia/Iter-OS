/**
 * Catálogo estático de relatórios exportáveis do Iter OS. Não é dado de
 * negócio — não é editável pelo usuário e não vive no Supabase, só define
 * quais relatórios existem e qual permissão cada um exige (ver
 * src/lib/permissions.ts). Todo o resto dos dados vem do Supabase — ver
 * src/data/store.ts.
 */
import type { ReportDefinition } from '@/types'

export const mockReports: ReportDefinition[] = [
  { id: 'rep_dashboard_geral', title: 'Dashboard Geral', description: 'Panorama consolidado da operação inteira.', requiredAction: 'exportar', scope: 'geral' },
  { id: 'rep_dashboard_operacional', title: 'Dashboard Operacional', description: 'Comercial, clientes, operação e financeiro.', requiredAction: 'exportar', scope: 'operacional' },
  { id: 'rep_dashboard_criativo', title: 'Dashboard Criativo', description: 'Produção de conteúdo e aprovações.', requiredAction: 'exportar', scope: 'criativo' },
  { id: 'rep_cliente', title: 'Relatório por Cliente', description: 'Visão consolidada de um cliente específico.', requiredAction: 'exportar', scope: 'cliente' },
  { id: 'rep_financeiro', title: 'Relatório Financeiro', description: 'Receitas, despesas e indicadores financeiros.', requiredAction: 'ver_financeiro', scope: 'operacional' },
  { id: 'rep_conteudo', title: 'Relatório de Conteúdo', description: 'Peças em produção, revisão e aprovação.', requiredAction: 'exportar', scope: 'criativo' },
  { id: 'rep_tarefas', title: 'Relatório de Tarefas', description: 'Tarefas por status, responsável e prazo.', requiredAction: 'exportar', scope: 'operacional' },
]
