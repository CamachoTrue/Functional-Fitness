import { expect, test } from '@playwright/test'

import {
  createUser,
  hasServiceRole,
  loginViaUi,
  promoteToAdmin,
  seedAssignedRoutine,
  seedExercise,
  seedPurchase,
  seedQuestionnaire,
  uniqueEmail,
} from './helpers.js'

// Cobertura e2e del constructor de rutinas admin (Fase 10A). Requiere la service
// key (promoteToAdmin + seeds que bypassan RLS: purchase/questionnaire/exercise/
// rutina asignada); sin ella se salta.
//
// Casos:
//  (1) camino feliz: desde un cuestionario con compra approved, crear rutina,
//      añadir un día + un ejercicio y asignarla → badge "Asignada".
//  (2) negativo: rutina de un cliente cuya única compra está pending → al asignar
//      el trigger validate_assigned_routine falla y se muestra el mensaje
//      no_approved_purchase.
//  (3) una-rutina-por-compra: intentar crear una 2ª rutina para una compra que
//      ya tiene rutina redirige a editar la existente (URL /admin/routines/<id>/edit).

test.describe('admin: constructor de rutinas (requiere service role)', () => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para el camino admin')

  const adminPassword = 'secret123'
  let adminEmail

  test.beforeAll(async () => {
    adminEmail = uniqueEmail('admin-rt')
    const admin = await createUser({
      email: adminEmail,
      password: adminPassword,
      fullName: 'Admin Rutinas E2E',
    })
    const adminId = admin?.user?.id ?? admin?.id
    await promoteToAdmin(adminId)
  })

  /** Crea un cliente y devuelve su id. */
  async function createClient(prefix) {
    const client = await createUser({
      email: uniqueEmail(prefix),
      password: 'secret123',
      fullName: 'Cliente Rutinas',
    })
    return client?.user?.id ?? client?.id
  }

  test('crear una rutina desde un cuestionario aprobado, añadir contenido y asignarla', async ({
    page,
  }) => {
    const clientId = await createClient('cliente-ok')
    // Compra approved (requisito del trigger validate_assigned_routine) + su
    // cuestionario (aparece la fila en /admin/questionnaires con la acción activa).
    const purchaseId = await seedPurchase({ userId: clientId, paymentStatus: 'approved' })
    await seedQuestionnaire({ userId: clientId, purchaseId })
    const exerciseName = `Sentadilla RT ${Date.now()}${Math.floor(Math.random() * 1000)}`
    await seedExercise({ name: exerciseName })

    await loginViaUi(page, adminEmail, adminPassword)

    // Desde cuestionarios: la fila de una compra aprobada ofrece "Crear/asignar rutina".
    await page.goto('/admin/questionnaires')
    await expect(page.getByRole('heading', { name: 'Cuestionarios' })).toBeVisible()

    const questionnaireRow = page.getByRole('row').filter({ hasText: 'Cliente Rutinas' })
    await questionnaireRow
      .getByRole('link', { name: 'Crear/asignar rutina' })
      .first()
      .click()

    // El constructor abre en modo creación con userId/purchaseId en la query.
    await expect(page).toHaveURL(/\/admin\/routines\/create\?/)
    await expect(page.getByRole('heading', { name: 'Nueva rutina' })).toBeVisible()

    const routineName = `Rutina E2E ${Date.now()}${Math.floor(Math.random() * 1000)}`
    await page.getByLabel('Nombre de la rutina').fill(routineName)
    await page.getByRole('button', { name: 'Crear rutina' }).click()

    // Pasa a modo edición (URL con el id de la rutina recién creada, status draft).
    await expect(page).toHaveURL(/\/admin\/routines\/[0-9a-f-]+\/edit/)
    await expect(page.getByRole('heading', { name: 'Editar rutina' })).toBeVisible()
    await expect(page.getByText('Borrador')).toBeVisible()

    // Añadir un día.
    await page.getByLabel('Añadir día').fill('Tren inferior')
    await page.getByRole('button', { name: 'Añadir día' }).click()
    await expect(page.getByText('DÍA 1')).toBeVisible()

    // Añadir un ejercicio de la biblioteca al día. La opción del select combina
    // nombre y grupo muscular ("<nombre> · <grupo>"); seedExercise usa 'Cuádriceps'.
    await page
      .getByLabel('Ejercicio', { exact: true })
      .selectOption({ label: `${exerciseName} · Cuádriceps` })
    await page.getByRole('button', { name: 'Añadir ejercicio' }).click()
    // exact: para no coincidir con la opción del selector ("<nombre> · <grupo>").
    await expect(page.getByText(exerciseName, { exact: true })).toBeVisible()

    // Asignar la rutina: hay una compra approved, así que el trigger la acepta.
    await page.getByRole('button', { name: 'Asignar rutina' }).click()

    // El estado pasa a "Asignada" (badge success) y el botón de asignar desaparece.
    await expect(page.getByText('Asignada')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Asignar rutina' })).toHaveCount(0)
  })

  test('asignar sin compra aprobada muestra el mensaje no_approved_purchase', async ({ page }) => {
    const clientId = await createClient('cliente-pending')
    // Única compra del cliente en 'pending': el trigger rechazará el assign.
    const purchaseId = await seedPurchase({ userId: clientId, paymentStatus: 'pending' })

    await loginViaUi(page, adminEmail, adminPassword)

    // Abrimos el constructor en creación apuntando a esa compra (la vista no exige
    // approved para crear el draft; el rechazo ocurre al intentar asignar).
    await page.goto(`/admin/routines/create?userId=${clientId}&purchaseId=${purchaseId}`)
    await expect(page.getByRole('heading', { name: 'Nueva rutina' })).toBeVisible()

    const routineName = `Rutina Pending ${Date.now()}${Math.floor(Math.random() * 1000)}`
    await page.getByLabel('Nombre de la rutina').fill(routineName)
    await page.getByRole('button', { name: 'Crear rutina' }).click()

    await expect(page).toHaveURL(/\/admin\/routines\/[0-9a-f-]+\/edit/)
    await expect(page.getByText('Borrador')).toBeVisible()

    // Intentar asignar → el trigger falla y useRoutineBuilder muestra el mensaje.
    await page.getByRole('button', { name: 'Asignar rutina' }).click()

    await expect(page.getByRole('alert')).toContainText(/no tiene una compra aprobada/i)
    // Sigue en borrador (no se asignó).
    await expect(page.getByText('Borrador')).toBeVisible()
  })

  test('crear una 2ª rutina para una compra que ya tiene rutina redirige a editarla', async ({
    page,
  }) => {
    const clientId = await createClient('cliente-dup')
    const purchaseId = await seedPurchase({ userId: clientId, paymentStatus: 'approved' })
    const exerciseId = await seedExercise({
      name: `Ejercicio Dup ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    })
    // Rutina YA asignada para esta compra (respeta routines_purchase_id_key).
    const { routineId } = await seedAssignedRoutine({ userId: clientId, purchaseId, exerciseId })

    await loginViaUi(page, adminEmail, adminPassword)

    // Al abrir el constructor en creación para una compra con rutina existente, la
    // vista hace el pre-check (fetchRoutineByPurchaseId) y redirige a editar la
    // rutina existente en vez de crear una segunda.
    await page.goto(`/admin/routines/create?userId=${clientId}&purchaseId=${purchaseId}`)

    await expect(page).toHaveURL(new RegExp(`/admin/routines/${routineId}/edit`))
    await expect(page.getByRole('heading', { name: 'Editar rutina' })).toBeVisible()
    // La rutina redirigida ya está asignada.
    await expect(page.getByText('Asignada')).toBeVisible()
  })
})
