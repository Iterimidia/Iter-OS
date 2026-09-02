import type { Page } from '@playwright/test'

/**
 * Credenciais e URL vêm SEMPRE de variáveis de ambiente — nunca hardcoded
 * aqui. Isso roda contra o Iter OS Staging real; ver .env.e2e.example na raiz
 * do repo pra lista completa de variáveis esperadas.
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[e2e] variável de ambiente "${name}" não definida. Estes testes dependem de credenciais reais do Iter OS Staging — ver .env.e2e.example.`,
    )
  }
  return value
}

export const credentials = {
  admin: () => ({ email: requireEnv('E2E_ADMIN_EMAIL'), password: requireEnv('E2E_ADMIN_PASSWORD') }),
  financeiro: () => ({ email: requireEnv('E2E_FINANCEIRO_EMAIL'), password: requireEnv('E2E_FINANCEIRO_PASSWORD') }),
  inativo: () => ({ email: requireEnv('E2E_INATIVO_EMAIL'), password: requireEnv('E2E_INATIVO_PASSWORD') }),
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
}

export async function loginAndWaitForApp(page: Page, email: string, password: string) {
  await login(page, email, password)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}
