import { expect, test } from '@playwright/test'
import { credentials, loginAndWaitForApp } from './helpers'

/**
 * CRUD simples e autocontido: reuniões (calendar_events, source='manual')
 * não têm FK de outra tabela dependendo delas, então criar + excluir na
 * mesma execução não deixa resíduo em staging (diferente de um cliente, que
 * dispara lançamento financeiro automático, ou de um item contratado, que
 * dispara reconciliação de delivery_units).
 */
test('admin cria uma reunião de teste e consegue excluí-la em seguida', async ({ page }) => {
  const { email, password } = credentials.admin()
  await loginAndWaitForApp(page, email, password)

  const title = `[e2e] reunião de teste ${Date.now()}`
  const today = new Date().toISOString().slice(0, 10)

  await page.goto('/operacional/calendario')
  await page.getByRole('button', { name: 'Nova reunião' }).click()
  await page.fill('#meetingTitle', title)
  await page.fill('#meetingDate', today)
  await page.getByRole('button', { name: 'Criar reunião' }).click()

  // O mesmo título aparece truncado tanto na célula do dia quanto no painel
  // de eventos do dia (DayEventsPanel) -- o botão de excluir vive só no
  // painel, então a asserção usa o item de lista específico.
  const eventItem = page.getByRole('listitem').filter({ hasText: title })
  await expect(eventItem).toBeVisible({ timeout: 10_000 })

  page.once('dialog', (dialog) => dialog.accept())
  await eventItem.getByRole('button', { name: 'Excluir evento' }).click()

  await expect(eventItem).toHaveCount(0)
})
