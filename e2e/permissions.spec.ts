import { expect, test } from '@playwright/test'
import { credentials, loginAndWaitForApp } from './helpers'

test.describe('Permissões — perfil financeiro (rota e menu precisam concordar)', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = credentials.financeiro()
    await loginAndWaitForApp(page, email, password)
  })

  test('acessa a rota liberada (Financeiro)', async ({ page }) => {
    await page.goto('/operacional/financeiro')
    await expect(page).toHaveURL(/\/operacional\/financeiro/)
  })

  test('é redirecionado ao tentar acessar uma rota fora do seu perfil (Equipe)', async ({ page }) => {
    await page.goto('/operacional/equipe')
    await expect(page).not.toHaveURL(/\/operacional\/equipe/)
  })

  test('o menu não oferece links pra áreas bloqueadas (consistência menu x rota)', async ({ page }) => {
    await page.goto('/operacional/financeiro')
    // Sidebar (desktop) e MobileNav convivem no DOM; só um está visível no
    // viewport atual -- restringe ao que está de fato visível.
    const nav = page.locator('nav:visible').first()
    await expect(nav.getByText('Financeiro', { exact: true })).toBeVisible()
    await expect(nav.getByText('Equipe', { exact: true })).toHaveCount(0)
  })
})
