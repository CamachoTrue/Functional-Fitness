import { expect, test } from '@playwright/test'

import { createUser, hasServiceRole, loginViaUi, promoteToAdmin, uniqueEmail } from './helpers.js'

test('la landing carga', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'SERA TRAINER' }).first()).toBeVisible()
})

test('registro redirige al panel de cliente', async ({ page }) => {
  const email = uniqueEmail('register')
  await page.goto('/register')
  await page.getByLabel('Nombre completo').fill('Nuevo Cliente')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('secret123')
  await page.getByRole('button', { name: /^Crear cuenta$/ }).click()
  await expect(page).toHaveURL(/\/client\/dashboard/)
})

test('login lleva al panel de cliente', async ({ page }) => {
  const email = uniqueEmail('login')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)
})

test('guard: usuario no autenticado es enviado a login', async ({ page }) => {
  await page.goto('/client/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('guard: un cliente no puede entrar al área admin', async ({ page }) => {
  const email = uniqueEmail('client-guard')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/client\/dashboard/)
})

test('guard: un admin entra al área admin y su home es el panel admin', async ({ page }) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para promover a admin')
  const email = uniqueEmail('admin')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  await promoteToAdmin(userId)
  // homeRoute de un admin es /admin/dashboard: el login sin redirect lo lleva ahí.
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  // El guard role==='admin' deja pasar a un admin a su panel tras recargar.
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/admin\/dashboard/)
})

test('guestOnly: un usuario autenticado no ve /login', async ({ page }) => {
  const email = uniqueEmail('guest')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/client\/dashboard/)
})

test('la sesión persiste tras recargar', async ({ page }) => {
  const email = uniqueEmail('session')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)
  await page.reload()
  await expect(page).toHaveURL(/\/client\/dashboard/)
})

test('cerrar sesión regresa al inicio y reprotege el área de cliente', async ({ page }) => {
  const email = uniqueEmail('logout')
  await createUser({ email, password: 'secret123' })
  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/client\/dashboard/)
  // Cerrar sesión vive en el menú de usuario y pide confirmación.
  await page.locator('button[aria-haspopup="menu"]').first().click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await page.getByRole('button', { name: /Sí, cerrar/ }).click()
  await expect(page).toHaveURL(/http:\/\/localhost:5173\/$/)
  await page.goto('/client/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
