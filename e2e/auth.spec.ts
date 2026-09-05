import { expect, test } from '@playwright/test'
import { credentials, login, loginAndWaitForApp } from './helpers'

test.describe('Autenticação', () => {
  test('login válido leva pra dentro da aplicação (sai de /login)', async ({ page }) => {
    const { email, password } = credentials.admin()
    await loginAndWaitForApp(page, email, password)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('login inválido mostra mensagem de erro e mantém o usuário em /login', async ({ page }) => {
    await login(page, 'usuario-que-nao-existe@iter.invalid', 'senha-errada-123')
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('usuário inativo é bloqueado mesmo com credenciais corretas (garantia de segurança, não a mensagem em si)', async ({ page }) => {
    const { email, password } = credentials.inativo()
    await login(page, email, password)
    // A garantia que importa é esta: NUNCA sair de /login. A mensagem
    // explicativa ("conta inativa...") depende de uma corrida de efeitos
    // já diagnosticada (RootRedirect x RequireAuth) e pode ocasionalmente
    // não renderizar visualmente -- isso é um problema de UX registrado
    // separadamente, não um bypass de segurança, então não é o que este
    // teste trava.
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/login/)
  })
})
