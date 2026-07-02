import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import {
  createUser,
  expirePurchaseAsService,
  hasServiceRole,
  loginViaUi,
  seedAssignedRoutine,
  seedExercise,
  seedPurchase,
  uploadExerciseVideoAsService,
  uniqueEmail,
} from './helpers.js'

// Cobertura e2e del panel del cliente (Fase 10B): el cliente ve su rutina
// ASIGNADA y reproduce el video vía signed URL on-demand, y la puerta RLS
// (20260618000300 + 20260618000500) oculta la rutina cuando la compra ya no está
// vigente. Requiere la service key (seeds que bypassan RLS + subida real de video
// con service role); sin ella se salta. No depende de Mercado Pago: la compra se
// siembra directamente approved.

const SAMPLE_MP4 = fileURLToPath(new URL('./fixtures/sample.mp4', import.meta.url))
const clientPassword = 'secret123'

test.describe('cliente: rutina asignada y video (requiere service role)', () => {
  test.skip(!hasServiceRole, 'Requiere SUPABASE_SERVICE_ROLE_KEY para sembrar y subir el video')

  /** Crea un cliente y devuelve { email, id }. */
  async function createClient(prefix) {
    const email = uniqueEmail(prefix)
    const client = await createUser({
      email,
      password: clientPassword,
      fullName: 'Cliente Rutina E2E',
    })
    return { email, id: client?.user?.id ?? client?.id }
  }

  test('el cliente ve su rutina lista y reproduce el video con signed URL', async ({ page }) => {
    const { email, id: clientId } = await createClient('cliente-rt-ok')

    // Compra approved vigente (requisito del trigger validate_assigned_routine y
    // de la puerta RLS de lectura de la rutina).
    const purchaseId = await seedPurchase({ userId: clientId, paymentStatus: 'approved' })

    // El video_path debe cumplir el CHECK exercises_video_path_format
    // (^exercises/[0-9a-f-]{36}/[^/]+$). Subimos el objeto REAL a esa ruta con la
    // service key para que el cliente pueda firmarlo (policy
    // exercise_videos_client_read_assigned) y el <video> obtenga una src válida.
    const videoPath = `exercises/${randomUUID()}/sample.mp4`
    await uploadExerciseVideoAsService(videoPath, SAMPLE_MP4)
    const exerciseName = `Sentadilla Cliente ${Date.now()}${Math.floor(Math.random() * 1000)}`
    const exerciseId = await seedExercise({ name: exerciseName, videoPath })

    // Rutina asignada ligada a la compra approved (el PATCH a 'assigned' pasa el
    // trigger porque la compra está approved para el mismo user_id).
    await seedAssignedRoutine({ userId: clientId, purchaseId, exerciseId })

    await loginViaUi(page, email, clientPassword)

    // Dashboard: la rutina está lista → aparece el botón único "Ver mi rutina"
    // (que solo se muestra cuando el estado es "Lista"; assert robusto sin
    // depender del texto suelto "Lista", que puede coincidir en varios lugares).
    await page.goto('/client/dashboard')
    await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible()

    const verRutina = page.getByRole('link', { name: 'Ver mi rutina' })
    await expect(verRutina).toBeVisible()
    await verRutina.click()

    // Vista de rutina: se muestra el día y el ejercicio (sin :routineId en la URL).
    await expect(page).toHaveURL(/\/client\/routine$/)
    await expect(page.getByRole('heading', { name: 'Mi rutina' })).toBeVisible()
    await expect(page.getByText('DÍA 1', { exact: true })).toBeVisible()
    await expect(page.getByText(exerciseName, { exact: true })).toBeVisible()

    // Reproducir el video: al pulsar "Ver video" se firma on-demand y el <video>
    // recibe una src (signed URL) no vacía, sin mostrar "Video no disponible".
    await page.getByRole('button', { name: 'Ver video' }).click()

    const video = page.locator('video')
    await expect(video).toBeVisible()
    await expect
      .poll(async () => (await video.getAttribute('src')) ?? '', {
        message: 'el video debería resolver una signed URL',
      })
      .not.toBe('')
    await expect(page.getByText('Video no disponible')).toHaveCount(0)
  })

  test('con la compra vencida la rutina no es visible (puerta RLS)', async ({ page }) => {
    const { email, id: clientId } = await createClient('cliente-rt-vencida')

    // Sembramos approved para poder ASIGNAR (el trigger exige approved al escribir)…
    const purchaseId = await seedPurchase({ userId: clientId, paymentStatus: 'approved' })
    const exerciseId = await seedExercise({
      name: `Ejercicio Vencido ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    })
    await seedAssignedRoutine({ userId: clientId, purchaseId, exerciseId })

    // …y luego vencemos la compra (end_date en el pasado). La rutina sigue en
    // 'assigned' pero la ruta de lectura (can_access_* + policy) exige end_date
    // nulo o futuro, así que deja de ser visible: confirma la puerta de 20260618000500.
    await expirePurchaseAsService(purchaseId)

    await loginViaUi(page, email, clientPassword)

    // La rutina no aparece: se muestra el estado "en preparación" (refleja la RLS
    // sin fuga de datos), no los días ni el ejercicio.
    await page.goto('/client/routine')
    await expect(page.getByRole('heading', { name: 'Mi rutina' })).toBeVisible()
    await expect(page.getByText('Tu rutina aún está en preparación')).toBeVisible()
    await expect(page.getByText('DÍA 1', { exact: true })).toHaveCount(0)

    // El dashboard tampoco marca la rutina como "Lista": sin compra vigente no hay
    // plan activo, así que se muestra el estado vacío del panel.
    await page.goto('/client/dashboard')
    await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible()
    await expect(page.getByText('Aún no tienes un plan activo')).toBeVisible()
    await expect(page.getByText('Lista')).toHaveCount(0)
  })
})
