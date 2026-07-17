import { expect, test } from '@playwright/test'

import {
  createUser,
  hasServiceRole,
  loginViaUi,
  seedPurchase,
  uniqueEmail,
} from './helpers.js'

// Cobertura e2e del cuestionario de evaluacion del cliente.
// Las compras se siembran con service role (bypassa RLS y la Edge Function de
// pago): sin SUPABASE_SERVICE_ROLE_KEY los casos que dependen de una compra se
// saltan con test.skip. Nada de Mercado Pago: el estado approved/pending se crea
// directamente en la base y las vistas lo leen bajo la RLS del propio usuario.

/** Rellena una seccion valida del cuestionario. */
async function fillValidQuestionnaire(page) {
  await page.getByLabel('Objetivo principal').selectOption('lose_fat')
  await page.getByLabel('Nivel de experiencia').selectOption('basic')
  await page.getByLabel('Edad (años)').fill('30')
  await page.getByLabel('Peso (kg)').fill('75')
  await page.getByLabel('Altura (cm)').fill('178')
  await page.getByLabel('Lugar de entrenamiento').selectOption('gym')
  await page.getByLabel('Días por semana').selectOption('4')
  await page.getByLabel('Tiempo por sesión (minutos)').fill('60')
  await page.getByLabel('Horario preferido').selectOption('morning')
}

test('crear: el cliente completa y guarda el cuestionario de una compra approved', async ({
  page,
}) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('q-create')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'approved' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  await page.goto(`/cliente/cuestionario/${purchaseId}`)

  // Estado inicial: PENDIENTE y boton de creacion.
  await expect(page.getByText('PENDIENTE')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar cuestionario' })).toBeVisible()

  await fillValidQuestionnaire(page)
  await page.getByRole('button', { name: 'Guardar cuestionario' }).click()

  // Confirmacion (role=status) y el estado pasa a COMPLETADO.
  await expect(page.getByRole('status')).toContainText('Guardamos tu cuestionario')
  await expect(page.getByText('COMPLETADO')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Actualizar cuestionario' })).toBeVisible()

  // Persistencia: al recargar sigue COMPLETADO y con los valores guardados.
  await page.reload()
  await expect(page.getByText('COMPLETADO')).toBeVisible()
  await expect(page.getByLabel('Edad (años)')).toHaveValue('30')
  await expect(page.getByLabel('Objetivo principal')).toHaveValue('lose_fat')
})

test('editar: el cliente actualiza un campo (upsert) y persiste', async ({ page }) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('q-edit')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'approved' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  await page.goto(`/cliente/cuestionario/${purchaseId}`)
  await fillValidQuestionnaire(page)
  await page.getByRole('button', { name: 'Guardar cuestionario' }).click()
  await expect(page.getByRole('status')).toContainText('Guardamos tu cuestionario')

  // Cambiamos un campo y guardamos de nuevo: el upsert actualiza la misma fila.
  await page.getByLabel('Edad (años)').fill('42')
  await page.getByRole('button', { name: 'Actualizar cuestionario' }).click()
  await expect(page.getByRole('status')).toContainText('Guardamos tu cuestionario')

  await page.reload()
  await expect(page.getByText('COMPLETADO')).toBeVisible()
  await expect(page.getByLabel('Edad (años)')).toHaveValue('42')
})

test('validacion: una edad fuera de rango muestra el error en español y no guarda', async ({
  page,
}) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('q-valid')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'approved' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  await page.goto(`/cliente/cuestionario/${purchaseId}`)
  await page.getByLabel('Edad (años)').fill('5')
  await page.getByRole('button', { name: 'Guardar cuestionario' }).click()

  // Mensaje de validacion en español; el cuestionario NO se guarda (sigue
  // PENDIENTE, sin confirmacion).
  await expect(page.getByText('La edad debe estar entre 13 y 100 años.')).toBeVisible()
  await expect(page.getByText('PENDIENTE')).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)

  // Al recargar no persistio nada: sigue pendiente y el campo vacio.
  await page.reload()
  await expect(page.getByText('PENDIENTE')).toBeVisible()
  await expect(page.getByLabel('Edad (años)')).toHaveValue('')
})

test('compra no approved: la vista muestra el EmptyState y no el formulario', async ({ page }) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('q-pending')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'pending' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  await page.goto(`/cliente/cuestionario/${purchaseId}`)

  // Compra no confirmada: EmptyState (refleja la barrera RLS) y sin formulario.
  await expect(page.getByText('Esta compra no admite cuestionario')).toBeVisible()
  await expect(page.getByLabel('Objetivo principal')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /cuestionario/i })).toHaveCount(0)
})

test('entrada: la vista de compras lista la compra approved con su estado y enlace', async ({
  page,
}) => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar la compra')

  const email = uniqueEmail('q-list')
  const created = await createUser({ email, password: 'secret123' })
  const userId = created?.user?.id ?? created?.id
  const purchaseId = await seedPurchase({ userId, paymentStatus: 'approved' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  await page.goto('/cliente/compras')

  // La compra approved aparece con estado PENDIENTE y enlace a su cuestionario.
  await expect(page.getByRole('heading', { name: 'Plan Basico' })).toBeVisible()
  await expect(page.getByText('Cuestionario: PENDIENTE')).toBeVisible()

  const link = page.getByRole('link', { name: 'Completar cuestionario' })
  await expect(link).toHaveAttribute('href', `/cliente/cuestionario/${purchaseId}`)

  await link.click()
  await expect(page).toHaveURL(new RegExp(`/cliente/cuestionario/${purchaseId}`))
  await expect(page.getByLabel('Objetivo principal')).toBeVisible()
})
