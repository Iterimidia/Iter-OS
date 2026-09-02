import { expect, test } from '@playwright/test'
import { credentials, loginAndWaitForApp } from './helpers'

/**
 * Confirma o caminho POSITIVO depois da correção pós-revisão da Fase 5
 * (aprovar sozinho não bastava -- passou a exigir aprovar + editar): um
 * perfil que tem as duas ações (admin) continua vendo e conseguindo acessar
 * a tela de aprovações normalmente. Não clica em nenhuma ação de mutation
 * (aprovar/pedir ajustes/publicar) pra não alterar dado real de conteúdo em
 * staging só por rodar o teste.
 */
test('admin acessa Aprovações e vê os controles de aprovação normalmente', async ({ page }) => {
  const { email, password } = credentials.admin()
  await loginAndWaitForApp(page, email, password)

  await page.goto('/criativo/aprovacoes')

  await expect(page).toHaveURL(/\/criativo\/aprovacoes/)
  // A Topbar também tem um <h1> com o título da página -- o <h2> é o
  // cabeçalho de seção específico desta tela (SectionHeader).
  await expect(page.getByRole('heading', { level: 2, name: 'Aprovações' })).toBeVisible()
})
