import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import {
  createUser,
  fetchExerciseByIdAsService,
  hasServiceRole,
  loginViaUi,
  promoteToAdmin,
  seedExercise,
  seedRoutineWithExercise,
  uniqueEmail,
} from './helpers.js'

// Cobertura e2e del CRUD admin de ejercicios con subida REAL de video al bucket
// privado exercise-videos (Fase 9). Requiere la service key (promoteToAdmin, y las
// aserciones vía service que leen exercises.video_path); sin ella se salta.
//
// Casos: crear con video, previsualizar (signed URL), reemplazar, borrado
// bloqueado por FK (routine_exercises, on delete restrict) con mensaje "en uso",
// y borrado exitoso (fila eliminada, sin error). El fixture MP4 ya existe.

const SAMPLE_MP4 = fileURLToPath(new URL('./fixtures/sample.mp4', import.meta.url))
const SAMPLE_MP4_2 = fileURLToPath(new URL('./fixtures/sample-2.mp4', import.meta.url))

test.describe('admin: CRUD de ejercicios con video (requiere service role)', () => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para el camino admin')

  const adminPassword = 'secret123'
  let adminEmail

  test.beforeAll(async () => {
    adminEmail = uniqueEmail('admin-ex')
    const admin = await createUser({
      email: adminEmail,
      password: adminPassword,
      fullName: 'Admin Ejercicios E2E',
    })
    const adminId = admin?.user?.id ?? admin?.id
    await promoteToAdmin(adminId)
  })

  function exerciseRow(page, name) {
    return page.getByRole('row').filter({ hasText: name })
  }

  test('crear un ejercicio con video, previsualizarlo y reemplazarlo', async ({ page }) => {
    const name = `Sentadilla E2E ${Date.now()}${Math.floor(Math.random() * 1000)}`

    await loginViaUi(page, adminEmail, adminPassword)

    // --- Crear con todos los campos + subida real de video ---
    await page.goto('/admin/exercises')
    await expect(page.getByRole('heading', { name: 'Ejercicios' })).toBeVisible()

    await page.getByRole('link', { name: 'Nuevo ejercicio' }).click()
    await expect(page).toHaveURL(/\/admin\/exercises\/create/)
    await expect(page.getByRole('heading', { name: 'Nuevo ejercicio' })).toBeVisible()

    await page.getByLabel('Nombre').fill(name)
    await page.getByLabel('Categoría').selectOption('Pierna')
    await page.getByLabel('Nivel').selectOption('basic')
    await page.getByLabel('Grupo muscular').fill('Cuádriceps')
    await page.getByLabel('Equipo').fill('Barra')
    await page.getByLabel('Descripción').fill('Ejercicio de prueba e2e.')
    await page.getByLabel('Errores comunes').fill('Rodillas hacia adentro.')

    await page.getByLabel('Archivo de video').setInputFiles(SAMPLE_MP4)
    // Se muestra el nombre del archivo elegido.
    await expect(page.getByText('sample.mp4')).toBeVisible()

    await page.getByRole('button', { name: 'Crear ejercicio' }).click()

    // Vuelve a la lista y el ejercicio aparece con indicador de video.
    await expect(page).toHaveURL(/\/admin\/exercises$/)
    await expect(exerciseRow(page, name)).toContainText(name)
    await expect(exerciseRow(page, name)).toContainText('Con video')

    // --- Editar: el preview <video> tiene una src no vacía (signed URL) ---
    await exerciseRow(page, name).getByRole('link', { name: 'Editar' }).click()
    await expect(page).toHaveURL(/\/admin\/exercises\/[0-9a-f-]+\/edit/)
    await expect(page.getByRole('heading', { name: 'Editar ejercicio' })).toBeVisible()

    // Capturamos el id del ejercicio de la URL para verificar el path vía service.
    const exerciseId = new URL(page.url()).pathname.split('/').slice(-2, -1)[0]
    const before = await fetchExerciseByIdAsService(exerciseId)
    expect(before?.video_path).toBeTruthy()

    const video = page.locator('video')
    await expect(video).toBeVisible()
    await expect
      .poll(async () => (await video.getAttribute('src')) ?? '', {
        message: 'la vista previa debería resolver una signed URL',
      })
      .not.toBe('')

    // --- Reemplazar el video con otro archivo (distinto filename => path cambia) ---
    await page.getByRole('button', { name: 'Reemplazar video' }).click()
    await page.getByLabel('Archivo de video').setInputFiles(SAMPLE_MP4_2)
    await expect(page.getByText('sample-2.mp4')).toBeVisible()

    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(/\/admin\/exercises$/)
    // Sigue teniendo video en la lista.
    await expect(exerciseRow(page, name)).toContainText('Con video')

    // Vía service: el video_path cambió al del nuevo archivo.
    const after = await fetchExerciseByIdAsService(exerciseId)
    expect(after?.video_path).toBeTruthy()
    expect(after.video_path).not.toBe(before.video_path)
    expect(after.video_path).toContain('sample-2')
  })

  test('el borrado se bloquea si el ejercicio está en uso por una rutina', async ({ page }) => {
    const name = `Ejercicio En Uso ${Date.now()}${Math.floor(Math.random() * 1000)}`

    // Sembramos un ejercicio y una rutina (draft) que lo referencia: la FK
    // routine_exercises.exercise_id (on delete restrict) bloqueará el DELETE.
    const clientEmail = uniqueEmail('cliente-ex')
    const client = await createUser({
      email: clientEmail,
      password: 'secret123',
      fullName: 'Cliente Ejercicios',
    })
    const clientId = client?.user?.id ?? client?.id
    const exerciseId = await seedExercise({ name })
    await seedRoutineWithExercise({ userId: clientId, exerciseId })

    await loginViaUi(page, adminEmail, adminPassword)
    await page.goto('/admin/exercises')

    // Confirmamos el diálogo nativo de confirmación de borrado.
    page.on('dialog', (dialog) => dialog.accept())

    await exerciseRow(page, name).getByRole('button', { name: 'Eliminar' }).click()

    // La UI muestra el mensaje de "en uso" (en el alert, no en el nombre de la
    // fila) y el ejercicio permanece.
    await expect(page.getByRole('alert')).toContainText(/en uso/i)
    await expect(exerciseRow(page, name)).toContainText(name)

    // Vía service: la fila sigue existiendo.
    const still = await fetchExerciseByIdAsService(exerciseId)
    expect(still?.id).toBe(exerciseId)
  })

  test('el borrado exitoso elimina la fila sin error', async ({ page }) => {
    const name = `Ejercicio Borrable ${Date.now()}${Math.floor(Math.random() * 1000)}`

    await loginViaUi(page, adminEmail, adminPassword)

    // Creamos un ejercicio con video desde la UI para cubrir el borrado del objeto.
    await page.goto('/admin/exercises/create')
    await page.getByLabel('Nombre').fill(name)
    await page.getByLabel('Categoría').selectOption('Core')
    await page.getByLabel('Nivel').selectOption('basic')
    await page.getByLabel('Archivo de video').setInputFiles(SAMPLE_MP4)
    await page.getByRole('button', { name: 'Crear ejercicio' }).click()

    await expect(page).toHaveURL(/\/admin\/exercises$/)
    await expect(exerciseRow(page, name)).toContainText(name)

    // Resolvemos el id desde el href del enlace "Editar" de la fila.
    const editHref = await exerciseRow(page, name)
      .getByRole('link', { name: 'Editar' })
      .getAttribute('href')
    const exerciseId = editHref.split('/').slice(-2, -1)[0]
    const created = await fetchExerciseByIdAsService(exerciseId)
    expect(created?.id).toBeTruthy()

    // Borramos desde la UI (sin uso => éxito).
    page.on('dialog', (dialog) => dialog.accept())
    await exerciseRow(page, name).getByRole('button', { name: 'Eliminar' }).click()

    // La fila desaparece de la tabla y no hay mensaje de error de borrado.
    // Se comprueba el alert (no un texto suelto, que podría coincidir con el
    // nombre de otro ejercicio residual como "Ejercicio En Uso …").
    await expect(exerciseRow(page, name)).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)

    // Vía service: la fila ya no existe.
    const gone = await fetchExerciseByIdAsService(created.id)
    expect(gone).toBeNull()
  })
})
