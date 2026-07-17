import { expect, test } from '@playwright/test'

import {
  createUser,
  hasServiceRole,
  loginViaUi,
  promoteToAdmin,
  seedPurchase,
  seedQuestionnaire,
  uniqueEmail,
} from './helpers.js'

// Cobertura e2e del área de administración (Fase 8, SOLO LECTURA).
//
// El camino admin necesita datos reales sembrados con la service key: un admin
// (promoteToAdmin), un cliente distinto con una compra approved (seedPurchase) y
// su cuestionario (seedQuestionnaire). Sin SUPABASE_SERVICE_ROLE_KEY esos casos se
// saltan con test.skip. El guard de no-admin no necesita service key y siempre corre.
//
// El admin lee profiles/purchases/questionnaires bajo la RLS de private.is_admin();
// las vistas unen por user_id EN EL CLIENTE (no hay embedding profiles↔purchases).

test.describe('admin con datos reales (requiere service role)', () => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar datos admin')

  const adminPassword = 'secret123'
  const clientPassword = 'secret123'

  let adminEmail
  let clientEmail
  let clientName
  let clientId

  test.beforeAll(async () => {
    // Admin dedicado para el área de administración.
    adminEmail = uniqueEmail('admin')
    const admin = await createUser({
      email: adminEmail,
      password: adminPassword,
      fullName: 'Admin E2E',
    })
    const adminId = admin?.user?.id ?? admin?.id
    await promoteToAdmin(adminId)

    // Cliente distinto con una compra approved y su cuestionario.
    clientEmail = uniqueEmail('cliente')
    clientName = 'Cliente E2E'
    const client = await createUser({
      email: clientEmail,
      password: clientPassword,
      fullName: clientName,
    })
    clientId = client?.user?.id ?? client?.id
    const purchaseId = await seedPurchase({ userId: clientId, paymentStatus: 'approved' })
    await seedQuestionnaire({
      userId: clientId,
      purchaseId,
      values: { objective: 'lose_fat', experience_level: 'basic', days_per_week: 4 },
    })
  })

  test('dashboard: muestra métricas reales y la compra en las últimas compras', async ({
    page,
  }) => {
    await loginViaUi(page, adminEmail, adminPassword)
    await expect(page).toHaveURL(/\/admin\/dashboard/)

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Las 4 tarjetas de métricas están presentes.
    await expect(page.getByText('Ventas del mes')).toBeVisible()
    await expect(page.getByText('Clientes activos')).toBeVisible()
    await expect(page.getByText('Compras pendientes')).toBeVisible()
    await expect(page.getByText('Rutinas pendientes')).toBeVisible()

    // La compra sembrada aparece en "Últimas compras" y en "Paquetes más vendidos".
    await expect(page.getByRole('heading', { name: 'Últimas compras' })).toBeVisible()
    await expect(page.getByText('Plan Basico').first()).toBeVisible()
    await expect(page.getByText('Aprobada').first()).toBeVisible()
  })

  test('clientes: lista al cliente con su estado y enlace al detalle', async ({ page }) => {
    await loginViaUi(page, adminEmail, adminPassword)
    await page.goto('/admin/clients')

    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible()

    // El cliente aparece con su nombre y correo.
    const row = page.getByRole('row').filter({ hasText: clientEmail })
    await expect(row).toContainText(clientName)
    // Compra approved vigente => cliente activo con su plan.
    await expect(row).toContainText('Plan Basico')
    await expect(row).toContainText('Activo')

    // El enlace lleva al detalle del cliente.
    await row.getByRole('link', { name: 'Ver detalle' }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/clients/${clientId}`))
  })

  test('detalle: muestra los datos del cliente, su compra y su cuestionario', async ({
    page,
  }) => {
    await loginViaUi(page, adminEmail, adminPassword)
    await page.goto(`/admin/clients/${clientId}`)

    await expect(page.getByRole('heading', { name: clientName })).toBeVisible()
    await expect(page.getByText(clientEmail)).toBeVisible()

    // Historial de compras con la compra approved.
    await expect(page.getByRole('heading', { name: 'Historial de compras' })).toBeVisible()
    await expect(page.getByText('Plan Basico').first()).toBeVisible()
    await expect(page.getByText('Aprobada').first()).toBeVisible()

    // Cuestionario contestado con sus valores.
    await expect(page.getByRole('heading', { name: 'Cuestionarios contestados' })).toBeVisible()
    // Los enums se muestran mapeados a español (lose_fat→Bajar grasa, basic→Principiante).
    await expect(page.getByText('Bajar grasa').first()).toBeVisible()
    await expect(page.getByText('Principiante').first()).toBeVisible()
  })

  test('compras: lista la compra con estado y fechas', async ({ page }) => {
    await loginViaUi(page, adminEmail, adminPassword)
    await page.goto('/admin/purchases')

    await expect(page.getByRole('heading', { name: 'Compras' })).toBeVisible()

    const row = page.getByRole('row').filter({ hasText: clientEmail })
    await expect(row).toContainText('Plan Basico')
    await expect(row).toContainText('Aprobada')
    // La compra approved tiene fechas de inicio/vencimiento (no "—").
    await expect(row).toContainText(clientName)
  })

  test('cuestionarios: muestra objetivo/nivel/días y el acceso a crear rutina', async ({
    page,
  }) => {
    await loginViaUi(page, adminEmail, adminPassword)
    await page.goto('/admin/questionnaires')

    await expect(page.getByRole('heading', { name: 'Cuestionarios' })).toBeVisible()

    const row = page.getByRole('row').filter({ hasText: clientEmail })
    // Los enums se muestran mapeados a español (lose_fat→Bajar grasa, basic→Principiante).
    await expect(row).toContainText('Bajar grasa')
    await expect(row).toContainText('Principiante')
    await expect(row).toContainText('4')
    await expect(row).toContainText('Plan Basico')

    // La compra del cuestionario está aprobada: el acceso a crear/asignar rutina
    // (Fase 10A) está habilitado. El flujo completo se cubre en admin-routines.spec.js.
    const cta = row.getByRole('button', { name: /Crear\/asignar rutina/ })
    await expect(cta).toBeVisible()
    await expect(cta).toBeEnabled()
  })
})

test('guard: un cliente no-admin es redirigido y no ve el área de administración', async ({
  page,
}) => {
  // No requiere service role: basta un cliente normal (rol por defecto 'client').
  const email = uniqueEmail('no-admin')
  await createUser({ email, password: 'secret123', fullName: 'No Admin' })

  await loginViaUi(page, email, 'secret123')
  await expect(page).toHaveURL(/\/cliente\/panel/)

  // Al intentar entrar al área admin, el guard (meta role:'admin') lo devuelve a
  // su homeRoute de cliente y no se muestra ningún contenido de administración.
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/cliente\/panel/)
  await expect(page.getByText('CONTROL GENERAL')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0)
})
