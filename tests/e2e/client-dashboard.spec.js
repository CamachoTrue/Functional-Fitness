import { expect, test } from '@playwright/test'

import {
  createUser,
  hasServiceRole,
  loginViaUi,
  seedPurchase,
  uniqueEmail,
} from './helpers.js'

test('sin plan, el panel saluda al cliente y muestra el estado vacío', async ({ page }) => {
  const email = uniqueEmail('dashboard')
  await createUser({ email, password: 'secret123', fullName: 'Panel Cliente' })
  await loginViaUi(page, email, 'secret123')

  await expect(page).toHaveURL(/\/cliente\/panel/)
  await expect(page.getByRole('heading', { name: /Hola, Panel Cliente/ })).toBeVisible()

  // Un cliente recién registrado no tiene compra approved: el panel muestra el
  // EmptyState honesto y un CTA a los paquetes (sin métricas fabricadas).
  await expect(page.getByText('Aún no tienes un plan activo')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver paquetes' })).toBeVisible()
})

test('con un plan vigente, el panel muestra las métricas y el estado del plan', async ({ page }) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar una compra approved')

  const email = uniqueEmail('dashboard-plan')
  const created = await createUser({ email, password: 'secret123', fullName: 'Plan Cliente' })
  const userId = created?.user?.id ?? created?.id
  // Compra approved y vigente (Plan Basico del seed) para que el panel derive el
  // plan activo, los tiles y el estado del cuestionario/rutina.
  await seedPurchase({ userId })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  // Tiles de métricas honestas + tarjeta del plan vigente.
  await expect(page.getByText('Días restantes')).toBeVisible()
  await expect(page.getByText('Días de entrenamiento')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plan Basico' })).toBeVisible()
  await expect(page.getByText('Activo')).toBeVisible()
  // Sin cuestionario todavía: el estado derivado es "Pendiente".
  await expect(page.getByText('Pendiente').first()).toBeVisible()
})
