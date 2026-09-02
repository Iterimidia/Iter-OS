import { expect, test } from '@playwright/test'
import { credentials, login } from './helpers'

/**
 * Reproduz em navegador real o cenário que motivou a correção pós-revisão da
 * 5ª rodada da Fase 4 (loadError sendo limpo cedo demais no retry): força uma
 * falha de rede numa das tabelas buscadas por `initialize()`, confirma que a
 * aplicação privada NUNCA renderiza com dado incompleto (mostra a tela de
 * erro com "Tentar novamente" em vez disso), e que uma tentativa seguinte
 * bem-sucedida libera a aplicação normalmente.
 */
test('falha ao carregar dados mostra tela de erro; nova tentativa bem-sucedida libera a aplicação', async ({ page }) => {
  const { email, password } = credentials.admin()

  let shouldFail = true
  await page.route('**/rest/v1/clients*', async (route) => {
    if (shouldFail) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'forced failure (e2e)' }) })
    } else {
      await route.continue()
    }
  })

  await login(page, email, password)

  const retryButton = page.getByRole('button', { name: /tentar novamente/i })
  await expect(retryButton).toBeVisible({ timeout: 15_000 })

  shouldFail = false
  await retryButton.click()

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /tentar novamente/i })).toHaveCount(0)
})
