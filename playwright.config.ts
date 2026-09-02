import { defineConfig, devices } from '@playwright/test'

/**
 * E2E roda contra o Iter OS Staging de verdade (não localStorage, não mock) —
 * por isso fica fora do `npm test` normal e depende de variáveis de ambiente
 * com credenciais reais, nunca commitadas. Ver e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Ambientes com um Chromium pré-instalado em local não padrão (ex:
        // sandboxes) podem apontar pra ele via env var, sem precisar baixar
        // outro nem hardcodar um caminho aqui.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
      },
    },
  ],
})
